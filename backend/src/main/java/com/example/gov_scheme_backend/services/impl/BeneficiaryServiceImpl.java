package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.beneficiary.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.response.beneficiary.BeneficiaryResponseDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Beneficiary;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.BeneficiaryRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.BeneficiaryService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepo beneficiaryRepo;
    private final UserRepo usersRepo;
    private final ApplicationRepo applicationRepo;
    private final com.example.gov_scheme_backend.repositories.AuditLogRepo auditLogRepo;
    private final com.example.gov_scheme_backend.repositories.DisbursementPlanRepo disbursementPlanRepo;
    private final com.example.gov_scheme_backend.repositories.DisbursementMilestoneRepo disbursementMilestoneRepo;

    /** Creates a beneficiary record linked to a user and their approved application. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO registerBeneficiary(BeneficiaryRequestDTO request) {
        if (beneficiaryRepo.existsByApplication_Id(request.getApplicationId())) {
            throw new DuplicateResourceException("Beneficiary already exists for this application");
        }

        Users user = usersRepo.findByuniqueID(request.getUniqueID())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUniqueID()));

        Application application = applicationRepo.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + request.getApplicationId()));

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setUser(user);
        beneficiary.setApplication(application);
        beneficiary.setSanctionedAmount(request.getSanctionedAmount());
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
        beneficiary.setApprovedDate(request.getApprovedDate());
        beneficiary.setDisbursedDate(request.getDisbursedDate());
        beneficiary.setRemarks(request.getRemarks());
        beneficiary.setIsFlagged(false);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.CREATE)
                .description("Registered beneficiary for Application ID: " + request.getApplicationId())
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    @Override
    public BeneficiaryResponseDTO getBeneficiary(Long id) {
        return mapToResponse(getExistingBeneficiary(id));
    }

    @Override
    public BeneficiaryResponseDTO getCurrentBeneficiary() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        if (!StringUtils.hasText(username)) {
            throw new ResourceNotFoundException("Authenticated beneficiary user not found");
        }

        Beneficiary beneficiary = beneficiaryRepo.findByUser_Username(username).orElse(null);
        if (beneficiary != null) {
            return mapToResponse(beneficiary);
        }

        // If no standalone Beneficiary row exists in table, dynamically resolve from the user's application and disbursement plan
        Users user = usersRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        List<Application> userApps = applicationRepo.findByUser_IdOrderByCreatedAtDesc(user.getId());
        if (userApps.isEmpty()) {
            throw new ResourceNotFoundException("Beneficiary record not found for current user");
        }

        Application targetApp = userApps.stream()
                .filter(a -> a.getStatus() == com.example.gov_scheme_backend.enums.ApplicationStatus.APPROVED
                          || a.getStatus() == com.example.gov_scheme_backend.enums.ApplicationStatus.DISBURSED)
                .findFirst()
                .orElse(userApps.get(0));

        Double sanctionedAmount = null;
        Double disbursedAmount = 0.0;
        com.example.gov_scheme_backend.entities.DisbursementPlan plan =
                disbursementPlanRepo.findByApplicationId(targetApp.getId()).orElse(null);

        if (plan != null) {
            if (plan.getTotalAmount() != null) {
                sanctionedAmount = plan.getTotalAmount().doubleValue();
            }
            List<com.example.gov_scheme_backend.entities.DisbursementMilestone> milestones =
                    disbursementMilestoneRepo.findByPlanOrderByStageNumberAsc(plan);
            disbursedAmount = milestones.stream()
                    .filter(m -> m.getCompletionStatus() == com.example.gov_scheme_backend.enums.MilestoneStatus.RELEASED)
                    .map(m -> m.getAmountReleased() != null ? m.getAmountReleased().doubleValue() : (m.getAmountToRelease() != null ? m.getAmountToRelease().doubleValue() : 0.0))
                    .reduce(0.0, Double::sum);
        }

        return BeneficiaryResponseDTO.builder()
                .id(targetApp.getId())
                .uniqueID(user.getUniqueID())
                .applicationId(targetApp.getId())
                .sanctionedAmount(sanctionedAmount)
                .disbursedAmount(disbursedAmount)
                .currentStatus(com.example.gov_scheme_backend.enums.BeneficiaryStatus.ACTIVE)
                .approvedDate(targetApp.getUpdatedAt() != null ? targetApp.getUpdatedAt().toLocalDate() : (targetApp.getCreatedAt() != null ? targetApp.getCreatedAt().toLocalDate() : java.time.LocalDate.now()))
                .disbursedDate(disbursedAmount > 0 ? java.time.LocalDate.now() : null)
                .remarks(targetApp.getRemarks())
                .isFlagged(false)
                .build();
    }

    @Override
    public List<BeneficiaryResponseDTO> getAllBeneficiaries() {
        return beneficiaryRepo.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /** Updates editable fields (amounts, dates, remarks). */
    @Transactional
    public BeneficiaryResponseDTO updateBeneficiary(Long id, BeneficiaryRequestDTO request) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setSanctionedAmount(request.getSanctionedAmount());
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
        beneficiary.setApprovedDate(request.getApprovedDate());
        beneficiary.setDisbursedDate(request.getDisbursedDate());
        beneficiary.setRemarks(request.getRemarks());

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Updated beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Marks a beneficiary as flagged with a mandatory reason (e.g. document mismatch, fraud suspicion). */
    @Override
    @Transactional
    public BeneficiaryResponseDTO flagBeneficiary(Long id, String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Flag reason is required");
        }

        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setIsFlagged(true);
        beneficiary.setFlagReason(reason);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Flagged beneficiary ID: " + id + " with reason: " + reason)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Clears the flag from a beneficiary once reviewed. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO unflagBeneficiary(Long id) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setIsFlagged(false);
        beneficiary.setFlagReason(null);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Unflagged beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Deletes a beneficiary record. */
    @Override
    @Transactional
    public void deleteBeneficiary(Long id) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiaryRepo.delete(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.DELETE)
                .description("Deleted beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);
    }

    @Override
    @Transactional
    public BeneficiaryResponseDTO disburseBeneficiary(Long id, com.example.gov_scheme_backend.dto.request.schemes.DisbursementRequestDTO request) {
        Beneficiary beneficiary = getExistingBeneficiary(id);

        if (Boolean.TRUE.equals(beneficiary.getIsFlagged())) {
            throw new BadRequestException("Beneficiary is flagged for review and cannot be disbursed");
        }

        // set disbursement details
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
               if (request.getRemarks() != null) {
            beneficiary.setRemarks(request.getRemarks());
        }
        // mark beneficiary active (business choice)
        beneficiary.setCurrentStatus(com.example.gov_scheme_backend.enums.BeneficiaryStatus.ACTIVE);

        beneficiary = beneficiaryRepo.save(beneficiary);

        // Update application status to DISBURSED
        Application application = beneficiary.getApplication();
        application.setStatus(com.example.gov_scheme_backend.enums.ApplicationStatus.DISBURSED);
        applicationRepo.save(application);

        // Write audit log
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.DISBURSE)
                .description("Disbursed amount " + request.getDisbursedAmount() + " to beneficiary id " + id + (performer != null ? " by " + performer.getUsername() : ""))
                .build();

        auditLogRepo.save(audit);

        return mapToResponse(beneficiary);
    }

    private Beneficiary getExistingBeneficiary(Long id) {
        return beneficiaryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with id: " + id));
    }

    private BeneficiaryResponseDTO mapToResponse(Beneficiary beneficiary) {
        Double sanctioned = beneficiary.getSanctionedAmount();
        Double disbursed = beneficiary.getDisbursedAmount();

        if (beneficiary.getApplication() != null) {
            com.example.gov_scheme_backend.entities.DisbursementPlan plan =
                    disbursementPlanRepo.findByApplicationId(beneficiary.getApplication().getId()).orElse(null);
            if (plan != null) {
                if (plan.getTotalAmount() != null) {
                    sanctioned = plan.getTotalAmount().doubleValue();
                }
                List<com.example.gov_scheme_backend.entities.DisbursementMilestone> milestones =
                        disbursementMilestoneRepo.findByPlanOrderByStageNumberAsc(plan);
                disbursed = milestones.stream()
                        .filter(m -> m.getCompletionStatus() == com.example.gov_scheme_backend.enums.MilestoneStatus.RELEASED)
                        .map(m -> m.getAmountReleased() != null ? m.getAmountReleased().doubleValue() : (m.getAmountToRelease() != null ? m.getAmountToRelease().doubleValue() : 0.0))
                        .reduce(0.0, Double::sum);
            }
        }

        return BeneficiaryResponseDTO.builder()
                .id(beneficiary.getId())
                .uniqueID(beneficiary.getUser() != null ? beneficiary.getUser().getUniqueID() : null)
                .applicationId(beneficiary.getApplication() != null ? beneficiary.getApplication().getId() : null)
                .sanctionedAmount(sanctioned)
                .disbursedAmount(disbursed)
                .currentStatus(beneficiary.getCurrentStatus())
                .approvedDate(beneficiary.getApprovedDate())
                .disbursedDate(beneficiary.getDisbursedDate())
                .remarks(beneficiary.getRemarks())
                .isFlagged(beneficiary.getIsFlagged())
                .flagReason(beneficiary.getFlagReason())
                .build();
    }
}
