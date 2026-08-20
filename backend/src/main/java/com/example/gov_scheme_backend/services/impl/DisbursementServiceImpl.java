package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.disbursement.StageConfigurationRequest;
import com.example.gov_scheme_backend.dto.request.disbursement.StageDto;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementMilestoneResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementPlanResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.OverdueMilestoneResponse;
import com.example.gov_scheme_backend.entities.*;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.AuditAction;
import com.example.gov_scheme_backend.enums.MilestoneStatus;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.*;
import com.example.gov_scheme_backend.services.DisbursementService;
import com.example.gov_scheme_backend.dto.response.disbursement.MilestoneContextResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.SuggestedStagesResponse;
import com.example.gov_scheme_backend.enums.NotificationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DisbursementServiceImpl implements DisbursementService {

    @Autowired
    private DisbursementPlanRepo planRepo;

    @Autowired
    private DisbursementMilestoneRepo milestoneRepo;

    @Autowired
    private ApplicationRepo applicationRepo;

    @Autowired
    private SchemeRepo schemeRepo;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private SchemeCategoryRepository schemeCategoryRepository;

    @Autowired
    private NotificationRepo notificationRepo;

    @Override
    @Transactional
    public DisbursementPlanResponse configurePlan(Long planId, StageConfigurationRequest request) {
        DisbursementPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + planId));

        if (request.getStages() == null || request.getStages().isEmpty()) {
            throw new BadRequestException("At least one stage configuration is required");
        }

        // Validate number of stages
        if (request.getStages().size() != plan.getTotalStages()) {
            throw new BadRequestException("Stage configuration count (" + request.getStages().size() 
                    + ") must match the plan's total stages (" + plan.getTotalStages() + ")");
        }

        // Validate sum of amounts
        double totalConfiguredAmount = request.getStages().stream()
                .mapToDouble(StageDto::getAmountToRelease)
                .sum();

        if (Math.abs(totalConfiguredAmount - plan.getTotalAmount()) > 0.01) {
            throw new BadRequestException("The sum of stage amounts (₹" + totalConfiguredAmount 
                    + ") does not equal the total approved grant (₹" + plan.getTotalAmount() + ")");
        }

        // Fetch existing milestones
        List<DisbursementMilestone> existingMilestones = milestoneRepo.findByPlanOrderByStageNumberAsc(plan);
        boolean hasCompletedOrReleased = existingMilestones.stream()
                .anyMatch(m -> m.getCompletionStatus() == MilestoneStatus.COMPLETED 
                            || m.getCompletionStatus() == MilestoneStatus.RELEASED
                            || m.getCompletionStatus() == MilestoneStatus.OVERDUE);

        if (hasCompletedOrReleased) {
            throw new BadRequestException("Cannot reconfigure disbursement plan since some stages are already completed, overdue, or released");
        }

        // Clear existing milestones if any
        if (!existingMilestones.isEmpty()) {
            milestoneRepo.deleteAll(existingMilestones);
        }

        // Save new milestones
        List<DisbursementMilestone> savedMilestones = new ArrayList<>();
        for (StageDto stage : request.getStages()) {
            if (stage.getAmountToRelease() <= 0) {
                throw new BadRequestException("Stage amount must be greater than zero");
            }
            if (stage.getStageNumber() <= 0) {
                throw new BadRequestException("Stage number must be greater than zero");
            }

            // Milestone 1 (Initial Documentation Submitted) is released immediately on plan activation
            // This means it is already COMPLETED upon configuration and ready for release
            MilestoneStatus status = (stage.getStageNumber() == 1) ? MilestoneStatus.COMPLETED : MilestoneStatus.PENDING;
            LocalDate completedDate = (stage.getStageNumber() == 1) ? LocalDate.now() : null;

            DisbursementMilestone milestone = DisbursementMilestone.builder()
                    .plan(plan)
                    .stageNumber(stage.getStageNumber())
                    .milestoneName(stage.getMilestoneName())
                    .amountToRelease(stage.getAmountToRelease())
                    .dueDate(stage.getDueDate())
                    .completionStatus(status)
                    .completedDate(completedDate)
                    .build();

            savedMilestones.add(milestoneRepo.save(milestone));
        }

        // Stage 1 requires no prior compliance milestone — release it immediately
        // so the beneficiary receives the first installment as soon as the
        // Finance Officer finalizes the plan, with no extra manual step.
        savedMilestones.stream()
                .filter(m -> m.getStageNumber() == 1)
                .findFirst()
                .ifPresent(stage1 -> releaseMilestone(stage1.getMilestoneId()));

        List<DisbursementMilestone> refreshed = milestoneRepo.findByPlanOrderByStageNumberAsc(plan);
        return mapToPlanResponse(plan, refreshed);
    }

    @Override
    @Transactional
    public DisbursementMilestoneResponse completeMilestone(Long milestoneId) {
        DisbursementMilestone milestone = milestoneRepo.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (milestone.getCompletionStatus() == MilestoneStatus.RELEASED) {
            throw new BadRequestException("Milestone is already released");
        }

        milestone.setCompletionStatus(MilestoneStatus.COMPLETED);
        milestone.setCompletedDate(LocalDate.now());
        DisbursementMilestone saved = milestoneRepo.save(milestone);

        notifyFinanceOfficerMilestoneReady(saved);

        return mapToMilestoneResponse(saved);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DisbursementMilestoneResponse releaseMilestone(Long milestoneId) {
        DisbursementMilestone milestone = milestoneRepo.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (milestone.getCompletionStatus() == MilestoneStatus.RELEASED) {
            throw new BadRequestException("Milestone is already released");
        }

        if (milestone.getCompletionStatus() == MilestoneStatus.PENDING) {
            throw new BadRequestException("Milestone status is PENDING and must be COMPLETED before release");
        }

        if (milestone.getCompletionStatus() == MilestoneStatus.OVERDUE) {
            throw new BadRequestException("Milestone status is OVERDUE and must be resolved by an admin before release");
        }

        // Sequential Block check & Overdue block checks
        DisbursementPlan plan = milestone.getPlan();
        List<DisbursementMilestone> allMilestones = milestoneRepo.findByPlanOrderByStageNumberAsc(plan);
        for (DisbursementMilestone m : allMilestones) {
            if (m.getStageNumber() < milestone.getStageNumber()) {
                if (m.getCompletionStatus() == MilestoneStatus.OVERDUE) {
                    throw new BadRequestException("Stage " + milestone.getStageNumber() 
                            + " release is blocked because Stage " + m.getStageNumber() + " is OVERDUE.");
                }
                if (m.getCompletionStatus() == MilestoneStatus.PENDING) {
                    throw new BadRequestException("Stage " + milestone.getStageNumber() 
                            + " cannot be released unless Stage " + m.getStageNumber() + " milestone is COMPLETE.");
                }
            }
        }

        // 1. Update milestone status
        milestone.setCompletionStatus(MilestoneStatus.RELEASED);
        milestone.setAmountReleased(milestone.getAmountToRelease());
        milestone.setReleaseDate(LocalDate.now());
        milestoneRepo.save(milestone);

        // 2. Update scheme budget
        Application application = applicationRepo.findById(milestone.getPlan().getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found for disbursement plan"));
        Schemes scheme = application.getScheme();
        double currentBudgetUsed = scheme.getBudgetUsed();
        scheme.setBudgetUsed(currentBudgetUsed + milestone.getAmountToRelease());
        schemeRepo.save(scheme);

        // 3. Write Audit Log
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        Users performer = null;
        if (username != null) {
            performer = userRepo.findByUsername(username).orElse(null);
        }

        AuditLog audit = AuditLog.builder()
                .auditId(UUID.randomUUID().toString())
                .user(performer)
                .action(AuditAction.DISBURSE)
                .description("Released milestone: " + milestone.getMilestoneName() + " (Stage " + milestone.getStageNumber() 
                        + ", Amount: ₹" + milestone.getAmountToRelease() + ") for Application ID: " + application.getId())
                .build();
        auditLogRepo.save(audit);

        return mapToMilestoneResponse(milestone);
    }

    @Override
    public DisbursementPlanResponse getPlanByApplication(Long applicationId) {
        DisbursementPlan plan = planRepo.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found for Application ID: " + applicationId));

        List<DisbursementMilestone> milestones = milestoneRepo.findByPlanOrderByStageNumberAsc(plan);
        return mapToPlanResponse(plan, milestones);
    }

    @Override
    public DisbursementPlanResponse getPlanById(Long planId) {
        DisbursementPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found for Plan ID: " + planId));

        List<DisbursementMilestone> milestones = milestoneRepo.findByPlanOrderByStageNumberAsc(plan);
        return mapToPlanResponse(plan, milestones);
    }

    @Override
    @Transactional
    public void sendUpcomingReminders() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysLater = today.plusDays(3);

        List<DisbursementMilestone> upcomingPending = milestoneRepo.findAll().stream()
                .filter(m -> m.getCompletionStatus() == MilestoneStatus.PENDING)
                .filter(m -> m.getDueDate() != null && !m.getDueDate().isBefore(today) && !m.getDueDate().isAfter(threeDaysLater))
                .toList();

        for (DisbursementMilestone m : upcomingPending) {
            // Idempotency check: if reminder sent today, skip
            if (notificationRepo.existsByMilestoneIdAndSentDate(m.getMilestoneId(), today)) {
                continue;
            }

            Application app = applicationRepo.findById(m.getPlan().getApplicationId()).orElse(null);
            if (app != null && app.getUser() != null) {
                Users beneficiary = app.getUser();
                String messageText = "Reminder: Your subsidy milestone '" + m.getMilestoneName() 
                        + "' (Stage " + m.getStageNumber() + ") is due on " + m.getDueDate() 
                        + ". Please submit utilization/documents to avoid blockages.";

                Notification notification = Notification.builder()
                        .user(beneficiary)
                        .milestoneId(m.getMilestoneId())
                        .message(messageText)
                        .sentDate(today)
                        .isRead(false)
                        .build();

                notificationRepo.save(notification);
            }
        }
    }

    @Override
    @Transactional
    public void flagOverdueMilestones() {
        LocalDate today = LocalDate.now();

        List<DisbursementMilestone> overduePending = milestoneRepo.findAll().stream()
                .filter(m -> m.getCompletionStatus() == MilestoneStatus.PENDING)
                .filter(m -> m.getDueDate() != null && m.getDueDate().isBefore(today))
                .toList();

        for (DisbursementMilestone m : overduePending) {
            // Update status to OVERDUE
            m.setCompletionStatus(MilestoneStatus.OVERDUE);
            milestoneRepo.save(m);

            // Audit Log
            AuditLog audit = AuditLog.builder()
                    .auditId(UUID.randomUUID().toString())
                    .action(AuditAction.UPDATE)
                    .description("Milestone marked as OVERDUE: " + m.getMilestoneName() 
                            + " (Stage " + m.getStageNumber() + ", Due Date: " + m.getDueDate() + ")")
                    .build();
            auditLogRepo.save(audit);
        }
    }

    @Override
    @Transactional
    public DisbursementMilestoneResponse resolveMilestone(Long milestoneId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Resolution reason is mandatory");
        }

        DisbursementMilestone milestone = milestoneRepo.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (milestone.getCompletionStatus() != MilestoneStatus.OVERDUE) {
            throw new BadRequestException("Milestone status is " + milestone.getCompletionStatus() 
                    + ", only OVERDUE milestones can be resolved by admin override.");
        }

        // Update status to COMPLETED
        milestone.setCompletionStatus(MilestoneStatus.COMPLETED);
        milestone.setCompletedDate(LocalDate.now());
        milestone.setResolvedReason(reason);
        milestone.setResolvedDate(LocalDate.now());
        milestoneRepo.save(milestone);

        // Audit Log
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        Users performer = null;
        if (username != null) {
            performer = userRepo.findByUsername(username).orElse(null);
        }

        AuditLog audit = AuditLog.builder()
                .auditId(UUID.randomUUID().toString())
                .user(performer)
                .action(AuditAction.UPDATE)
                .description("Admin Override Resolution: OVERDUE milestone ID " + milestoneId 
                        + " resolved. Reason: " + reason)
                .build();
        auditLogRepo.save(audit);

        return mapToMilestoneResponse(milestone);
    }

    @Override
    public List<OverdueMilestoneResponse> getOverdueMilestonesReport() {
        List<DisbursementMilestone> overdueMilestones = milestoneRepo.findAll().stream()
                .filter(m -> m.getCompletionStatus() == MilestoneStatus.OVERDUE)
                .toList();

        List<OverdueMilestoneResponse> responses = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (DisbursementMilestone m : overdueMilestones) {
            Application app = applicationRepo.findById(m.getPlan().getApplicationId()).orElse(null);
            String beneficiaryName = (app != null && app.getUser() != null) ? app.getUser().getFullName() : "Unknown";
            String schemeName = (app != null && app.getScheme() != null) ? app.getScheme().getSchemeName() : "Unknown";
            long daysOverdue = ChronoUnit.DAYS.between(m.getDueDate(), today);

            responses.add(OverdueMilestoneResponse.builder()
                    .milestoneId(m.getMilestoneId())
                    .beneficiaryName(beneficiaryName)
                    .schemeName(schemeName)
                    .milestoneName(m.getMilestoneName())
                    .dueDate(m.getDueDate())
                    .daysOverdue(daysOverdue)
                    .build());
        }

        return responses;
    }

    @Override
    public List<Notification> getUserNotifications(String username) {
        Users user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        return notificationRepo.findByUserOrderBySentDateDesc(user);
    }

    @Override
    @Transactional
    public DisbursementPlanResponse seedData() {
        // Seed Category
        SchemeCategory category = schemeCategoryRepository.findByCategoryName("Agriculture")
                .orElseGet(() -> {
                    SchemeCategory cat = new SchemeCategory();
                    cat.setCategoryName("Agriculture");
                    cat.setDescription("Agriculture Subsidy Schemes");
                    cat.setActive(true);
                    return schemeCategoryRepository.save(cat);
                });

        // Seed Scheme
        Schemes scheme = schemeRepo.findBySchemeCode("SCH-TEST")
                .orElseGet(() -> {
                    Schemes s = new Schemes();
                    s.setSchemeCode("SCH-TEST");
                    s.setSchemeName("Prime Minister Agriculture Grant");
                    s.setDescription("Assistance for modern agricultural tools.");
                    s.setAllocatedFunds(250000.0);
                    s.setMinimumEligibleScore(50.0);
                    s.setActive(true);
                    s.setCategory(category);
                    s.setBudgetUsed(0.0);
                    return schemeRepo.save(s);
                });

        // Seed User
        Users user = userRepo.findByUsername("farmer1").orElse(null);
        if (user == null) {
            user = new Users();
            user.setUniqueID("UID-9912093");
            user.setFullName("Ramesh Kumar");
            user.setUsername("farmer1");
            // encrypted "password"
            user.setPassword("$2a$10$8.ZTR5888/z8kPh6.t69K.7Ydoxz3u.D0h2l8z0Y6wB5bW0y6v34u");
            user.setRole(Role.BENEFICIARY);
            user.setRegion("North");
            user.setDistrict("North Delhi");
            user.setState("Delhi");
            user.setMobileNo("9811223344");
            user = userRepo.save(user);
        }

        // Seed Application
        Optional<Application> existingAppOpt = applicationRepo.findAll().stream()
                .filter(a -> a.getUser().getId().equals(userRepo.findByUsername("farmer1").get().getId()) 
                          && a.getScheme().getSchemeCode().equals("SCH-TEST"))
                .findFirst();

        Application application;
        if (existingAppOpt.isPresent()) {
            application = existingAppOpt.get();
        } else {
            application = new Application();
            application.setUser(user);
            application.setScheme(scheme);
            application.setApplicationCode("APP-TEST-DISB");
            application.setStatus(ApplicationStatus.APPROVED);
            application.setRemarks("Pre-approved for testing disbursement milestone tracking");
            application = applicationRepo.save(application);
        }

        // Seed Plan
        final Long appId = application.getId();

        DisbursementPlan plan = planRepo.findByApplicationId(appId).orElse(null);

        if (plan != null) {
            // Reset existing plan data for clean sandbox execution
            List<DisbursementMilestone> existingMilestones =
                    milestoneRepo.findByPlanOrderByStageNumberAsc(plan);

            milestoneRepo.deleteAll(existingMilestones);
            notificationRepo.deleteAll();
            auditLogRepo.deleteAll();
        } else {
            plan = DisbursementPlan.builder()
                    .applicationId(appId)
                    .totalAmount(50000.0)
                    .totalStages(3)
                    .build();

            plan = planRepo.save(plan);
        }

        // Seed milestones
        List<DisbursementMilestone> seedMilestones = List.of(

                DisbursementMilestone.builder()
                        .plan(plan)
                        .stageNumber(1)
                        .milestoneName("Initial Release")
                        .amountToRelease(20000.0)
                        .dueDate(LocalDate.now())
                        .completionStatus(MilestoneStatus.COMPLETED)
                        .completedDate(LocalDate.now())
                        .amountReleased(20000.0)
                        .releaseDate(LocalDate.now())
                        .build(),

                DisbursementMilestone.builder()
                        .plan(plan)
                        .stageNumber(2)
                        .milestoneName("Second Stage")
                        .amountToRelease(15000.0)
                        .dueDate(LocalDate.now().plusDays(30))
                        .completionStatus(MilestoneStatus.PENDING)
                        .amountReleased(0.0)
                        .build(),

                DisbursementMilestone.builder()
                        .plan(plan)
                        .stageNumber(3)
                        .milestoneName("Final Release")
                        .amountToRelease(15000.0)
                        .dueDate(LocalDate.now().plusDays(60))
                        .completionStatus(MilestoneStatus.PENDING)
                        .amountReleased(0.0)
                        .build()
        );

        milestoneRepo.saveAll(seedMilestones);

        List<DisbursementMilestone> milestones =
                milestoneRepo.findByPlanOrderByStageNumberAsc(plan);

        return mapToPlanResponse(plan, milestones);
    }

    private void notifyFinanceOfficerMilestoneReady(DisbursementMilestone milestone) {

        DisbursementPlan plan = milestone.getPlan();

        Users financeOfficer = null;
        if (plan.getFinanceOfficerId() != null) {
            financeOfficer = userRepo.findById(plan.getFinanceOfficerId()).orElse(null);
        }
        if (financeOfficer == null) {
            // Fallback for plans created before this field existed, or if the
            // originally-assigned officer no longer exists.
            financeOfficer = userRepo.findByRole(Role.FINANCE_OFFICER)
                    .stream()
                    .findFirst()
                    .orElse(null);
        }
        if (financeOfficer == null) {
            return; // nobody to notify — skip silently, don't block milestone completion
        }

        Application app = applicationRepo.findById(plan.getApplicationId()).orElse(null);
        String beneficiaryName = (app != null && app.getUser() != null) ? app.getUser().getFullName() : "Unknown";
        String applicationCode = (app != null) ? app.getApplicationCode() : "N/A";

        String message = "Milestone '" + milestone.getMilestoneName() + "' (Stage "
                + milestone.getStageNumber() + ") for " + beneficiaryName + "'s application "
                + applicationCode + " is complete and ready for disbursement of ₹"
                + milestone.getAmountToRelease() + ".";

        Notification notification = Notification.builder()
                .user(financeOfficer)
                .milestoneId(milestone.getMilestoneId())
                .message(message)
                .sentDate(LocalDate.now())
                .isRead(false)
                .notificationType(NotificationType.MILESTONE_READY)
                .build();

        notificationRepo.save(notification);
    }

    @Override
    public SuggestedStagesResponse suggestStages(Long planId) {

        DisbursementPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + planId));

        int n = plan.getTotalStages();
        double total = plan.getTotalAmount();

        // Even split, rounded down to 2 decimals per stage; the last stage
        // absorbs the rounding remainder so the sum always equals the total
        // exactly (required by configurePlan's validation).
        double baseAmount = Math.floor((total / n) * 100.0) / 100.0;
        double allocatedToFirstStages = baseAmount * (n - 1);
        double lastStageAmount = Math.round((total - allocatedToFirstStages) * 100.0) / 100.0;

        List<StageDto> stages = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= n; i++) {
            double amount = (i == n) ? lastStageAmount : baseAmount;
            String name = (i == 1) ? "Initial Release" : (i == n) ? "Final Release" : "Stage " + i + " Release";
            // Stage 1 is due today since it releases immediately on finalization;
            // later stages are spaced 30 days apart as a starting suggestion —
            // the officer can edit every due date before finalizing.
            LocalDate dueDate = (i == 1) ? today : today.plusDays(30L * (i - 1));

            stages.add(new StageDto(i, name, amount, dueDate));
        }

        return SuggestedStagesResponse.builder()
                .planId(plan.getPlanId())
                .totalAmount(total)
                .totalStages(n)
                .suggestedStages(stages)
                .build();
    }

    @Override
    public MilestoneContextResponse getMilestoneContext(Long milestoneId) {

        DisbursementMilestone milestone = milestoneRepo.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        DisbursementPlan plan = milestone.getPlan();
        Application app = applicationRepo.findById(plan.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found for disbursement plan"));

        List<DisbursementMilestoneResponse> allMilestones = milestoneRepo
                .findByPlanOrderByStageNumberAsc(plan)
                .stream()
                .map(this::mapToMilestoneResponse)
                .collect(Collectors.toList());

        return MilestoneContextResponse.builder()
                .milestoneId(milestone.getMilestoneId())
                .stageNumber(milestone.getStageNumber())
                .milestoneName(milestone.getMilestoneName())
                .amountToRelease(milestone.getAmountToRelease())
                .dueDate(milestone.getDueDate())
                .completionStatus(milestone.getCompletionStatus())
                .completedDate(milestone.getCompletedDate())
                .planId(plan.getPlanId())
                .applicationId(app.getId())
                .applicationCode(app.getApplicationCode())
                .beneficiaryName(app.getUser() != null ? app.getUser().getFullName() : "Unknown")
                .schemeName(app.getScheme() != null ? app.getScheme().getSchemeName() : "Unknown")
                .allMilestones(allMilestones)
                .build();
    }

    private DisbursementPlanResponse mapToPlanResponse(DisbursementPlan plan, List<DisbursementMilestone> milestones) {
        List<DisbursementMilestoneResponse> milestoneResponses = milestones.stream()
                .map(this::mapToMilestoneResponse)
                .collect(Collectors.toList());

        return DisbursementPlanResponse.builder()
                .planId(plan.getPlanId())
                .applicationId(plan.getApplicationId())
                .totalAmount(plan.getTotalAmount())
                .totalStages(plan.getTotalStages())
                .milestones(milestoneResponses)
                .build();
    }

    private DisbursementMilestoneResponse mapToMilestoneResponse(DisbursementMilestone milestone) {
        return DisbursementMilestoneResponse.builder()
                .milestoneId(milestone.getMilestoneId())
                .stageNumber(milestone.getStageNumber())
                .milestoneName(milestone.getMilestoneName())
                .amountToRelease(milestone.getAmountToRelease())
                .dueDate(milestone.getDueDate())
                .completionStatus(milestone.getCompletionStatus())
                .completedDate(milestone.getCompletedDate())
                .amountReleased(milestone.getAmountReleased())
                .releaseDate(milestone.getReleaseDate())
                .resolvedReason(milestone.getResolvedReason())
                .resolvedDate(milestone.getResolvedDate())
                .build();
    }
}
