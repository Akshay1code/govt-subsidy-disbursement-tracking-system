package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.workflow.WorkflowActionRequest;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowAction;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.DisbursementPlanRepo;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.repositories.WorkflowHistoryRepository;
import com.example.gov_scheme_backend.services.impl.WorkflowServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests locking in the approval workflow ORDER:
 * FIELD_OFFICER -> REGIONAL_OFFICER -> DISTRICT_OFFICER -> FINANCE_OFFICER -> COMPLETED.
 * Each intermediate approval must return the case to the unassigned pool
 * (assignedOfficer = null) at the next stage, with the application UNDER_REVIEW.
 * Re-verification walks the same chain in reverse.
 */
@ExtendWith(MockitoExtension.class)
class WorkflowServiceImplTest {

    @Mock private VerificationWorkflowRepository workflowRepository;
    @Mock private WorkflowHistoryRepository workflowHistoryRepository;
    @Mock private UserRepo userRepo;
    @Mock private ApplicationRepo applicationRepo;
    @Mock private AuditLogRepo auditLogRepository;
    @Mock private NotificationRepo notificationRepository;
    @Mock private DisbursementPlanRepo disbursementPlanRepository;

    @InjectMocks
    private WorkflowServiceImpl workflowService;

    private Users officer(Long id, Role role) {
        Users u = new Users();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    private Application application(Long id) {
        Application a = new Application();
        a.setId(id);
        a.setStatus(ApplicationStatus.UNDER_REVIEW);
        return a;
    }

    private VerificationWorkflow workflowAt(WorkflowStage stage, Users assigned, Application app) {
        VerificationWorkflow w = new VerificationWorkflow();
        w.setCurrentStage(stage);
        w.setAssignedOfficer(assigned);
        w.setApplication(app);
        return w;
    }

    private WorkflowActionRequest action(WorkflowAction a) {
        WorkflowActionRequest r = new WorkflowActionRequest();
        r.setAction(a);
        return r;
    }

    @Test
    void approve_fromFieldOfficer_advancesToRegionalOfficer() {
        Users fo = officer(1L, Role.FIELD_OFFICER);
        Application app = application(100L);
        VerificationWorkflow wf = workflowAt(WorkflowStage.FIELD_OFFICER, fo, app);
        when(workflowRepository.findByApplicationId(100L)).thenReturn(Optional.of(wf));

        workflowService.processAction(100L, action(WorkflowAction.APPROVE), fo);

        assertEquals(WorkflowStage.REGIONAL_OFFICER, wf.getCurrentStage());
        assertNull(wf.getAssignedOfficer());
        assertEquals(ApplicationStatus.UNDER_REVIEW, app.getStatus());
    }

    @Test
    void approve_fromRegionalOfficer_advancesToDistrictOfficer() {
        Users ro = officer(2L, Role.REGIONAL_OFFICER);
        Application app = application(200L);
        VerificationWorkflow wf = workflowAt(WorkflowStage.REGIONAL_OFFICER, ro, app);
        when(workflowRepository.findByApplicationId(200L)).thenReturn(Optional.of(wf));

        workflowService.processAction(200L, action(WorkflowAction.APPROVE), ro);

        assertEquals(WorkflowStage.DISTRICT_OFFICER, wf.getCurrentStage());
        assertNull(wf.getAssignedOfficer());
        assertEquals(ApplicationStatus.UNDER_REVIEW, app.getStatus());
    }

    @Test
    void approve_fromDistrictOfficer_advancesToFinanceOfficer() {
        Users dof = officer(3L, Role.DISTRICT_OFFICER);
        Application app = application(300L);
        VerificationWorkflow wf = workflowAt(WorkflowStage.DISTRICT_OFFICER, dof, app);
        when(workflowRepository.findByApplicationId(300L)).thenReturn(Optional.of(wf));

        workflowService.processAction(300L, action(WorkflowAction.APPROVE), dof);

        assertEquals(WorkflowStage.FINANCE_OFFICER, wf.getCurrentStage());
        assertNull(wf.getAssignedOfficer());
        assertEquals(ApplicationStatus.UNDER_REVIEW, app.getStatus());
    }

    @Test
    void approve_fromFinanceOfficer_completesAndCreatesDisbursementPlan() {
        Users fin = officer(4L, Role.FINANCE_OFFICER);
        Application app = application(400L);
        VerificationWorkflow wf = workflowAt(WorkflowStage.FINANCE_OFFICER, fin, app);
        when(workflowRepository.findByApplicationId(400L)).thenReturn(Optional.of(wf));
        when(disbursementPlanRepository.findByApplicationId(400L)).thenReturn(Optional.empty());

        WorkflowActionRequest req = action(WorkflowAction.APPROVE);
        req.setApprovedAmount(50000.0);
        req.setNumberOfInstallments(3);

        workflowService.processAction(400L, req, fin);

        assertEquals(WorkflowStage.COMPLETED, wf.getCurrentStage());
        assertNull(wf.getAssignedOfficer());
        assertEquals(ApplicationStatus.APPROVED, app.getStatus());
        verify(disbursementPlanRepository).save(any(DisbursementPlan.class));
    }

    @Test
    void reVerify_fromRegionalOfficer_sendsBackToFieldOfficer() {
        Users ro = officer(2L, Role.REGIONAL_OFFICER);
        Users fo = officer(1L, Role.FIELD_OFFICER);
        Application app = application(500L);
        VerificationWorkflow wf = workflowAt(WorkflowStage.REGIONAL_OFFICER, ro, app);
        when(workflowRepository.findByApplicationId(500L)).thenReturn(Optional.of(wf));
        when(userRepo.findByRole(Role.FIELD_OFFICER)).thenReturn(List.of(fo));

        WorkflowActionRequest req = action(WorkflowAction.RE_VERIFY);
        req.setRemarks("Please re-check the land documents");

        workflowService.processAction(500L, req, ro);

        assertEquals(WorkflowStage.FIELD_OFFICER, wf.getCurrentStage());
        assertSame(fo, wf.getAssignedOfficer());
        assertEquals(ApplicationStatus.UNDER_REVIEW, app.getStatus());
    }
}
