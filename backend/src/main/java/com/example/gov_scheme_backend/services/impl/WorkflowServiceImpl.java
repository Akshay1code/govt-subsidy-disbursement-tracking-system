package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.workflow.WorkflowActionRequest;
import com.example.gov_scheme_backend.dto.response.workflow.WorkflowResponse;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.WorkflowHistory;
import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.AuditAction;
import com.example.gov_scheme_backend.enums.WorkflowAction;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.repositories.WorkflowHistoryRepository;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.repositories.DisbursementPlanRepo;
import com.example.gov_scheme_backend.services.WorkflowService;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private final VerificationWorkflowRepository workflowRepository;
    private final WorkflowHistoryRepository workflowHistoryRepository;
    private final UserRepo userRepo;
    private final ApplicationRepo applicationRepo;
    private final AuditLogRepo auditLogRepository;
    private final NotificationRepo notificationRepository;
    private final DisbursementPlanRepo disbursementPlanRepository;


    @Override
    public void createWorkflow(Application application) {
        VerificationWorkflow workflow = new VerificationWorkflow();

        workflow.setApplication(application);

        workflow.setCurrentStage(WorkflowStage.FIELD_OFFICER);

        workflow.setAssignedOfficer(null);

        workflowRepository.save(workflow);
    }

    @Override
    @Transactional
    public WorkflowResponse processAction(
            Long applicationId,
            WorkflowActionRequest request,
            Users currentUser) {

        VerificationWorkflow workflow = workflowRepository
                .findByApplicationId(applicationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Workflow not found"));

        Application application = workflow.getApplication();

        validateOfficer(workflow, currentUser);

        switch (request.getAction()) {

            case APPROVE:
                return approveApplication(
                        workflow,
                        application,
                        currentUser,
                        request
                );

            case REJECT:
                return rejectApplication(
                        workflow,
                        application,
                        currentUser,
                        request
                );

            case ESCALATE:
                return escalateApplication(
                        workflow,
                        application,
                        currentUser,
                        request
                );

            case RE_VERIFY:
                return reVerifyApplication(
                        workflow,
                        application,
                        currentUser,
                        request
                );

            default:
                throw new RuntimeException("Action not implemented yet");
        }
    }




    private WorkflowResponse approveApplication(
            VerificationWorkflow workflow,
            Application application,
            Users officer,
            WorkflowActionRequest request) {

        if (workflow.getCurrentStage() == WorkflowStage.FINANCE_OFFICER) {

            if (request.getApprovedAmount() == null) {
                throw new RuntimeException("Approved amount is required");
            }
            if (request.getNumberOfInstallments() == null || request.getNumberOfInstallments() < 1) {
                throw new RuntimeException("Number of installments is required and must be at least 1");
            }
        }

        WorkflowStage oldStage = workflow.getCurrentStage();
        ApplicationStatus oldStatus = application.getStatus();

        switch (workflow.getCurrentStage()) {

            case FIELD_OFFICER:
                moveToRegionalOfficer(workflow, application);
                break;

            case REGIONAL_OFFICER:
                moveToDistrictOfficer(workflow, application);
                break;

            case DISTRICT_OFFICER:
                moveToFinanceOfficer(workflow, application);
                break;

            case FINANCE_OFFICER:

                completeWorkflow(workflow, application);

                createDisbursementPlan(
                        application,
                        officer,
                        request
                );

                break;

            default:
                throw new RuntimeException("Invalid workflow stage");
        }

        workflowRepository.save(workflow);
        applicationRepo.save(application);

        WorkflowStage newStage = workflow.getCurrentStage();
        ApplicationStatus newStatus = application.getStatus();

        saveWorkflowHistory(
                workflow,
                officer,
                request,
                oldStage,
                newStage,
                oldStatus,
                newStatus
        );

        saveAuditLog(officer, request.getAction());

        if (newStage == WorkflowStage.COMPLETED) {

            // Only the terminal transition (Finance Officer's approval)
            // means the application is actually, fully approved.
            createNotification(
                    application.getUser(),
                    "Your application has been approved."
            );

        }
        // Intermediate stage moves (FIELD_OFFICER -> REGIONAL_OFFICER ->
        // DISTRICT_OFFICER -> FINANCE_OFFICER) intentionally send no
        // notification here — assignedOfficer is null until Admin
        // allocates it, and the beneficiary hasn't received a final
        // decision yet.

        return new WorkflowResponse(
                application.getId(),
                workflow.getCurrentStage(),
                application.getStatus(),
                "Workflow updated successfully"
        );
    }

    private void moveToDistrictOfficer(
            VerificationWorkflow workflow,
            Application application) {

        // No auto-pick anymore — the case returns to the unassigned pool at
        // its new stage. Admin allocates it to a District Officer via the
        // bulk allocation endpoints, respecting that officer's capacity.
        workflow.setCurrentStage(WorkflowStage.DISTRICT_OFFICER);
        workflow.setAssignedOfficer(null);

        application.setStatus(ApplicationStatus.UNDER_REVIEW);
    }

    private void moveToRegionalOfficer(
            VerificationWorkflow workflow,
            Application application) {

        // Same as above — reappears unassigned for admin to allocate to a
        // Regional Officer.
        workflow.setCurrentStage(WorkflowStage.REGIONAL_OFFICER);
        workflow.setAssignedOfficer(null);

        application.setStatus(ApplicationStatus.UNDER_REVIEW);
    }

    private void moveToFinanceOfficer(
            VerificationWorkflow workflow,
            Application application) {

        // Same as above — reappears unassigned for admin to allocate to a
        // Finance Officer.
        workflow.setCurrentStage(WorkflowStage.FINANCE_OFFICER);
        workflow.setAssignedOfficer(null);

        application.setStatus(ApplicationStatus.UNDER_REVIEW);
    }

    private void completeWorkflow(
            VerificationWorkflow workflow,
            Application application) {

        workflow.setCurrentStage(WorkflowStage.COMPLETED);
        workflow.setAssignedOfficer(null);

        application.setStatus(ApplicationStatus.APPROVED);
    }

    private WorkflowResponse rejectApplication(
            VerificationWorkflow workflow,
            Application application,
            Users officer,
            WorkflowActionRequest request) {

        WorkflowStage oldStage = workflow.getCurrentStage();
        ApplicationStatus oldStatus = application.getStatus();

        workflow.setCurrentStage(WorkflowStage.COMPLETED);
        workflow.setAssignedOfficer(null);

        application.setStatus(ApplicationStatus.REJECTED);

        workflowRepository.save(workflow);
        applicationRepo.save(application);

        WorkflowStage newStage = workflow.getCurrentStage();
        ApplicationStatus newStatus = application.getStatus();

        saveWorkflowHistory(
                workflow,
                officer,
                request,
                oldStage,
                newStage,
                oldStatus,
                newStatus
        );

        saveAuditLog(officer, request.getAction());

        createNotification(
                application.getUser(),
                "Your application has been rejected. Remarks: "
                        + request.getRemarks()
        );

        return new WorkflowResponse(
                application.getId(),
                workflow.getCurrentStage(),
                application.getStatus(),
                "Application rejected"
        );
    }

    private WorkflowResponse escalateApplication(
            VerificationWorkflow workflow,
            Application application,
            Users officer,
            WorkflowActionRequest request) {

        WorkflowStage oldStage = workflow.getCurrentStage();
        ApplicationStatus oldStatus = application.getStatus();

        switch (workflow.getCurrentStage()) {

            case FIELD_OFFICER:
                moveToRegionalOfficer(workflow, application);
                break;

            case REGIONAL_OFFICER:
                moveToDistrictOfficer(workflow, application);
                break;

            case DISTRICT_OFFICER:
                moveToFinanceOfficer(workflow, application);
                break;

            case FINANCE_OFFICER:
                throw new RuntimeException("Finance Officer cannot escalate");

            default:
                throw new RuntimeException("Invalid workflow stage");
        }

        workflowRepository.save(workflow);
        applicationRepo.save(application);

        WorkflowStage newStage = workflow.getCurrentStage();
        ApplicationStatus newStatus = application.getStatus();

        saveWorkflowHistory(
                workflow,
                officer,
                request,
                oldStage,
                newStage,
                oldStatus,
                newStatus
        );

        saveAuditLog(officer, request.getAction());

        createNotification(
                workflow.getAssignedOfficer(),
                "Application escalated to you for review. Application ID: "
                        + application.getId()
        );

        return new WorkflowResponse(
                application.getId(),
                workflow.getCurrentStage(),
                application.getStatus(),
                "Application escalated successfully"
        );
    }

    private WorkflowResponse reVerifyApplication(
            VerificationWorkflow workflow,
            Application application,
            Users officer,
            WorkflowActionRequest request) {

        if (request.getRemarks() == null || request.getRemarks().isBlank()) {
            throw new RuntimeException("Remarks are mandatory for re-verification");
        }

        WorkflowStage oldStage = workflow.getCurrentStage();
        ApplicationStatus oldStatus = application.getStatus();

        switch (workflow.getCurrentStage()) {

            case FIELD_OFFICER:

                workflow.setAssignedOfficer(null);
                application.setStatus(ApplicationStatus.PENDING);

                break;

            case REGIONAL_OFFICER:

                Users fieldOfficerForRegional = userRepo.findByRole(Role.FIELD_OFFICER)
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new RuntimeException("No Field Officer found"));

                workflow.setCurrentStage(WorkflowStage.FIELD_OFFICER);
                workflow.setAssignedOfficer(fieldOfficerForRegional);

                application.setStatus(ApplicationStatus.UNDER_REVIEW);

                break;

            case DISTRICT_OFFICER:

                Users regionalOfficerForDistrict = userRepo.findByRole(Role.REGIONAL_OFFICER)
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new RuntimeException("No Regional Officer found"));

                workflow.setCurrentStage(WorkflowStage.REGIONAL_OFFICER);
                workflow.setAssignedOfficer(regionalOfficerForDistrict);

                application.setStatus(ApplicationStatus.UNDER_REVIEW);

                break;

            case FINANCE_OFFICER:

                Users districtOfficerForFinance = userRepo.findByRole(Role.DISTRICT_OFFICER)
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new RuntimeException("No District Officer found"));

                workflow.setCurrentStage(WorkflowStage.DISTRICT_OFFICER);
                workflow.setAssignedOfficer(districtOfficerForFinance);

                application.setStatus(ApplicationStatus.UNDER_REVIEW);

                break;

            default:
                throw new RuntimeException("Invalid workflow stage");
        }

        workflowRepository.save(workflow);
        applicationRepo.save(application);

        WorkflowStage newStage = workflow.getCurrentStage();
        ApplicationStatus newStatus = application.getStatus();

        saveWorkflowHistory(
                workflow,
                officer,
                request,
                oldStage,
                newStage,
                oldStatus,
                newStatus
        );

        saveAuditLog(officer, request.getAction());

        if (workflow.getAssignedOfficer() != null) {

            createNotification(
                    workflow.getAssignedOfficer(),
                    "Application returned for re-verification. Application ID: "
                            + application.getId()
            );

        } else {

            createNotification(
                    application.getUser(),
                    "Additional information is required for your application. Remarks: "
                            + request.getRemarks()
            );
        }

        return new WorkflowResponse(
                application.getId(),
                workflow.getCurrentStage(),
                application.getStatus(),
                "Application sent for re-verification"
        );
    }

    private void saveWorkflowHistory(
            VerificationWorkflow workflow,
            Users officer,
            WorkflowActionRequest request,
            WorkflowStage oldStage,
            WorkflowStage newStage,
            ApplicationStatus oldStatus,
            ApplicationStatus newStatus) {

        WorkflowHistory history = new WorkflowHistory();

        history.setWorkflow(workflow);
        history.setPerformedBy(officer);

        history.setAction(request.getAction());

        history.setOldStage(oldStage);
        history.setNewStage(newStage);

        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);

        history.setRemarks(request.getRemarks());

        workflowHistoryRepository.save(history);
    }

    private void saveAuditLog(
            Users officer,
            WorkflowAction workflowAction) {

        AuditAction auditAction;

        switch (workflowAction) {

            case APPROVE:
                auditAction = AuditAction.APPROVE;
                break;

            case REJECT:
                auditAction = AuditAction.REJECT;
                break;

            case ESCALATE:
                auditAction = AuditAction.ESCALATE;
                break;

            case RE_VERIFY:
                auditAction = AuditAction.RE_VERIFY;
                break;

            default:
                auditAction = AuditAction.UPDATE;
        }

        AuditLog log = AuditLog.builder()
                .auditId("AUD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(officer)
                .action(auditAction)
                .description("Workflow action performed : " + workflowAction)
                .build();

        auditLogRepository.save(log);
    }

    private void validateOfficer(
            VerificationWorkflow workflow,
            Users currentUser) {

        if (workflow.getAssignedOfficer() == null) {
            throw new RuntimeException("No officer assigned");
        }

        if (!workflow.getAssignedOfficer().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You are not assigned to this application");
        }

        switch (workflow.getCurrentStage()) {

            case FIELD_OFFICER:

                if (currentUser.getRole() != Role.FIELD_OFFICER) {
                    throw new AccessDeniedException("Only Field Officer can perform this action");
                }

                break;

            case DISTRICT_OFFICER:

                if (currentUser.getRole() != Role.DISTRICT_OFFICER) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Only District Officer can perform this action"
                    );
                }

                break;

            case REGIONAL_OFFICER:

                if (currentUser.getRole() != Role.REGIONAL_OFFICER) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Only Regional Officer can perform this action"
                    );
                }

                break;

            case FINANCE_OFFICER:

                if (currentUser.getRole() != Role.FINANCE_OFFICER) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Only Finance Officer can perform this action"
                    );
                }

                break;

            default:
                throw new RuntimeException("Invalid workflow stage");
        }
    }

    private void createNotification(
            Users recipient,
            String message) {

        Notification notification = Notification.builder()
                .user(recipient)
                .message(message)
                .sentDate(LocalDate.now())
                .isRead(false)
                .build();

        notificationRepository.save(notification);
    }

    private void createDisbursementPlan(
            Application application,
            Users financeOfficer,
            WorkflowActionRequest request) {

        // Determine the amount to disburse. If the finance officer did not supply an
        // explicit approved amount, fall back to the scheme's standard benefit amount
        // so the payout is tracked against the scheme's funds.
        Double approvedAmount = request.getApprovedAmount();
        if ((approvedAmount == null || approvedAmount <= 0) && application.getScheme() != null && application.getScheme().getBenefit() != null) {
            approvedAmount = application.getScheme().getBenefit().doubleValue();
        }
        if (approvedAmount == null || approvedAmount <= 0) {
            throw new RuntimeException("Approved amount must be greater than zero");
        }

        if (request.getNumberOfInstallments() == null || request.getNumberOfInstallments() < 1) {
            throw new RuntimeException("Number of installments must be at least 1");
        }

        if (disbursementPlanRepository.findByApplicationId(application.getId()).isPresent()) {
            return;
        }

        DisbursementPlan plan = DisbursementPlan.builder()
                .applicationId(application.getId())
                .totalAmount(approvedAmount)
                .totalStages(request.getNumberOfInstallments())
                .financeOfficerId(financeOfficer != null ? financeOfficer.getId() : null)
                .build();

        disbursementPlanRepository.save(plan);
    }
}
