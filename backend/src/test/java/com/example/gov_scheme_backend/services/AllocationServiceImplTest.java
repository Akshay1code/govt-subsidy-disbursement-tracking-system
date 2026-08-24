package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.ApplicationAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.AuditAction;
import com.example.gov_scheme_backend.enums.NotificationType;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.services.NotificationService;
import com.example.gov_scheme_backend.services.impl.AllocationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the batch (workload-balancing) allocation engine — the P0
 * mechanism the Admin UI now drives. These lock in the deterministic behaviour:
 * FCFS queue order is the repository's job (proven separately), while these
 * tests prove officer selection is balanced, capacity-bounded, and tie-broken
 * deterministically by officer id.
 */
@ExtendWith(MockitoExtension.class)
class AllocationServiceImplTest {

    @Mock
    private UserRepo userRepo;
    @Mock
    private VerificationWorkflowRepository workflowRepository;
    @Mock
    private ApplicationRepo applicationRepository;
    @Mock
    private AuditLogRepo auditLogRepository;
    // AllocationServiceImpl now publishes an APPLICATION_ASSIGNED notification on
    // each allocation, so the collaborator must be mocked or the constructor
    // injection leaves it null (NPE at allocation time).
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AllocationServiceImpl allocationService;

    private Users officer(Long id, Role role, Integer capacity, String name) {
        Users u = new Users();
        u.setId(id);
        u.setRole(role);
        u.setAllocationCapacity(capacity);
        u.setFullName(name);
        return u;
    }

    private Application application(Long id) {
        Application a = new Application();
        a.setId(id);
        return a;
    }

    private VerificationWorkflow unassignedWorkflow(Application app, WorkflowStage stage) {
        VerificationWorkflow w = new VerificationWorkflow();
        w.setApplication(app);
        w.setCurrentStage(stage);
        w.setAssignedOfficer(null);
        return w;
    }

    @Test
    void batchAllocate_balancesByWorkload_andTieBreaksByOfficerId() {
        Users a = officer(1L, Role.FIELD_OFFICER, 10, "Officer A");
        Users b = officer(2L, Role.FIELD_OFFICER, 10, "Officer B");
        when(userRepo.findByRole(Role.FIELD_OFFICER)).thenReturn(List.of(a, b));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(0L);
        when(workflowRepository.countActiveAssignmentsByOfficer(2L)).thenReturn(0L);

        VerificationWorkflow wf1 = unassignedWorkflow(application(101L), WorkflowStage.FIELD_OFFICER);
        VerificationWorkflow wf2 = unassignedWorkflow(application(102L), WorkflowStage.FIELD_OFFICER);
        when(workflowRepository.findOldestUnassignedWorkflowsByStageWithLock(
                eq(WorkflowStage.FIELD_OFFICER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(wf1, wf2)));
        when(userRepo.findById(1L)).thenReturn(Optional.of(a));
        when(userRepo.findById(2L)).thenReturn(Optional.of(b));

        BatchAllocationRequestDTO req = new BatchAllocationRequestDTO();
        req.setStage(WorkflowStage.FIELD_OFFICER);
        req.setCount(2);

        BatchAllocationResponseDTO res =
                allocationService.batchAllocate(req, officer(99L, Role.ADMIN, 0, "Admin"));

        assertEquals(2, res.getAllocatedCount());
        assertEquals(2, res.getRequestedCount());
        // Both officers start equal → first application goes to the lower id
        // (tie-break); the second must go to the now-less-loaded other officer.
        assertSame(a, wf1.getAssignedOfficer());
        assertSame(b, wf2.getAssignedOfficer());
        verify(workflowRepository, times(2)).save(any(VerificationWorkflow.class));
        verify(auditLogRepository, times(2)).save(any(AuditLog.class));
    }

    @Test
    void batchAllocate_capsAtRemainingCapacity_returnsPartial() {
        Users a = officer(1L, Role.DISTRICT_OFFICER, 2, "Officer A");
        when(userRepo.findByRole(Role.DISTRICT_OFFICER)).thenReturn(List.of(a));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(0L);

        VerificationWorkflow wf1 = unassignedWorkflow(application(201L), WorkflowStage.DISTRICT_OFFICER);
        VerificationWorkflow wf2 = unassignedWorkflow(application(202L), WorkflowStage.DISTRICT_OFFICER);
        when(workflowRepository.findOldestUnassignedWorkflowsByStageWithLock(
                eq(WorkflowStage.DISTRICT_OFFICER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(wf1, wf2)));
        when(userRepo.findById(1L)).thenReturn(Optional.of(a));

        BatchAllocationRequestDTO req = new BatchAllocationRequestDTO();
        req.setStage(WorkflowStage.DISTRICT_OFFICER);
        req.setCount(5); // more than the single officer's capacity of 2

        BatchAllocationResponseDTO res =
                allocationService.batchAllocate(req, officer(99L, Role.ADMIN, 0, "Admin"));

        assertEquals(5, res.getRequestedCount());
        assertEquals(2, res.getAllocatedCount());
        assertTrue(res.getMessage().toLowerCase().contains("partial"),
                "Expected a partial-allocation message, got: " + res.getMessage());
        assertSame(a, wf1.getAssignedOfficer());
        assertSame(a, wf2.getAssignedOfficer());
    }

    @Test
    void batchAllocate_whenNoOfficerHasCapacity_allocatesZero() {
        Users a = officer(1L, Role.FINANCE_OFFICER, 2, "Officer A");
        when(userRepo.findByRole(Role.FINANCE_OFFICER)).thenReturn(List.of(a));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(2L); // already full

        BatchAllocationRequestDTO req = new BatchAllocationRequestDTO();
        req.setStage(WorkflowStage.FINANCE_OFFICER);
        req.setCount(3);

        BatchAllocationResponseDTO res =
                allocationService.batchAllocate(req, officer(99L, Role.ADMIN, 0, "Admin"));

        assertEquals(0, res.getAllocatedCount());
        assertEquals(3, res.getRequestedCount());
        // No queue is even fetched, and nothing is assigned, when capacity is exhausted.
        verify(workflowRepository, never())
                .findOldestUnassignedWorkflowsByStageWithLock(any(), any());
        verify(workflowRepository, never()).save(any(VerificationWorkflow.class));
    }

    @Test
    void getAvailableOfficers_computesRemainingCapacity_andFloorsAtZero() {
        Users a = officer(1L, Role.FIELD_OFFICER, 5, "Officer A");     // explicit capacity 5
        Users b = officer(2L, Role.FIELD_OFFICER, null, "Officer B");  // null → default 10
        when(userRepo.findByRole(Role.FIELD_OFFICER)).thenReturn(List.of(a, b));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(7L); // over capacity
        when(workflowRepository.countActiveAssignmentsByOfficer(2L)).thenReturn(3L);

        List<OfficerWorkloadDTO> result =
                allocationService.getAvailableOfficers(WorkflowStage.FIELD_OFFICER);

        OfficerWorkloadDTO dtoA = result.stream()
                .filter(o -> o.getOfficerId().equals(1L)).findFirst().orElseThrow();
        OfficerWorkloadDTO dtoB = result.stream()
                .filter(o -> o.getOfficerId().equals(2L)).findFirst().orElseThrow();

        assertEquals(5, dtoA.getCapacity());
        assertEquals(7L, dtoA.getAllocatedCount());
        assertEquals(0, dtoA.getRemainingCapacity()); // floored at 0, never negative
        assertEquals(10, dtoB.getCapacity());          // null capacity defaults to 10
        assertEquals(3L, dtoB.getAllocatedCount());
        assertEquals(7, dtoB.getRemainingCapacity());
    }

    @Test
    void allocateApplicationToOfficer_correctRoleOfficer_successfullyAssigned() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Users officer = officer(1L, Role.FIELD_OFFICER, 10, "Officer Field");
        officer.setUniqueID("FO_1001");

        Application app = application(101L);
        app.setApplicationCode("APP-101");
        VerificationWorkflow wf = unassignedWorkflow(app, WorkflowStage.FIELD_OFFICER);

        when(applicationRepository.findById(101L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(101L)).thenReturn(Optional.of(wf));
        when(userRepo.findById(1L)).thenReturn(Optional.of(officer));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(2L);

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(101L);
        req.setOfficerId("1");

        ApplicationAllocationResponseDTO res = allocationService.allocateApplicationToOfficer(req, admin);

        assertTrue(res.isStatus());
        assertEquals(101L, res.getApplicationId());
        assertEquals("FO_1001", res.getOfficerId());
        assertEquals("Officer Field", res.getOfficerName());
        assertEquals(WorkflowStage.FIELD_OFFICER.name(), res.getCurrentStage());

        assertSame(officer, wf.getAssignedOfficer());
        assertSame(officer, app.getAllocatedOfficer());
        verify(workflowRepository).save(wf);
        verify(applicationRepository).save(app);
        verify(notificationService).createAndPublishNotification(
                eq(officer),
                any(String.class),
                eq(NotificationType.APPLICATION_ASSIGNED),
                eq(null),
                eq(101L)
        );

        ArgumentCaptor<AuditLog> logCaptor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(logCaptor.capture());
        AuditLog savedLog = logCaptor.getValue();
        assertNotNull(savedLog);
        assertEquals(AuditAction.ALLOCATE, savedLog.getAction());
        assertEquals(admin, savedLog.getUser());
        assertTrue(savedLog.getDescription().contains("101"));
        assertTrue(savedLog.getDescription().contains("1"));
    }

    @Test
    void allocateApplicationToOfficer_wrongRoleOfficer_throwsBadRequestException() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Users districtOfficer = officer(2L, Role.DISTRICT_OFFICER, 10, "District Officer");

        Application app = application(102L);
        VerificationWorkflow wf = unassignedWorkflow(app, WorkflowStage.FIELD_OFFICER);

        when(applicationRepository.findById(102L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(102L)).thenReturn(Optional.of(wf));
        when(userRepo.findById(2L)).thenReturn(Optional.of(districtOfficer));

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(102L);
        req.setOfficerId("2");

        assertThrows(BadRequestException.class, () ->
                allocationService.allocateApplicationToOfficer(req, admin));

        verify(workflowRepository, never()).save(any());
        verify(applicationRepository, never()).save(any());
        verify(notificationService, never()).createAndPublishNotification(any(), any(), any(), any(), any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void allocateApplicationToOfficer_fullCapacityOfficer_throwsBadRequestException() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Users officer = officer(1L, Role.FIELD_OFFICER, 3, "Officer Field");

        Application app = application(103L);
        VerificationWorkflow wf = unassignedWorkflow(app, WorkflowStage.FIELD_OFFICER);

        when(applicationRepository.findById(103L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(103L)).thenReturn(Optional.of(wf));
        when(userRepo.findById(1L)).thenReturn(Optional.of(officer));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(3L); // at max capacity

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(103L);
        req.setOfficerId("1");

        assertThrows(BadRequestException.class, () ->
                allocationService.allocateApplicationToOfficer(req, admin));

        verify(workflowRepository, never()).save(any());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void allocateApplicationToOfficer_reassigningToSameOfficer_allowedEvenIfFullCapacity() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Users officer = officer(1L, Role.FIELD_OFFICER, 3, "Officer Field");

        Application app = application(104L);
        app.setAllocatedOfficer(officer);
        VerificationWorkflow wf = unassignedWorkflow(app, WorkflowStage.FIELD_OFFICER);
        wf.setAssignedOfficer(officer); // already assigned to officer 1

        when(applicationRepository.findById(104L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(104L)).thenReturn(Optional.of(wf));
        when(userRepo.findById(1L)).thenReturn(Optional.of(officer));
        // countActiveAssignmentsByOfficer is not even called or bypassed because isSameOfficer is true

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(104L);
        req.setOfficerId("1");

        ApplicationAllocationResponseDTO res = allocationService.allocateApplicationToOfficer(req, admin);

        assertTrue(res.isStatus());
        verify(workflowRepository).save(wf);
        verify(applicationRepository).save(app);
        verify(notificationService).createAndPublishNotification(eq(officer), any(), eq(NotificationType.APPLICATION_ASSIGNED), eq(null), eq(104L));
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void allocateApplicationToOfficer_missingWorkflow_throwsResourceNotFoundException() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Application app = application(105L);

        when(applicationRepository.findById(105L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(105L)).thenReturn(Optional.empty());

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(105L);
        req.setOfficerId("1");

        assertThrows(ResourceNotFoundException.class, () ->
                allocationService.allocateApplicationToOfficer(req, admin));
    }

    @Test
    void allocateApplicationToOfficer_missingApplication_throwsResourceNotFoundException() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");

        when(applicationRepository.findById(106L)).thenReturn(Optional.empty());

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(106L);
        req.setOfficerId("1");

        assertThrows(ResourceNotFoundException.class, () ->
                allocationService.allocateApplicationToOfficer(req, admin));
    }

    @Test
    void allocateApplicationToOfficer_resolvesOfficerByUniqueID() {
        Users admin = officer(99L, Role.ADMIN, 0, "Admin");
        Users officer = officer(1L, Role.FIELD_OFFICER, 10, "Officer Field");
        officer.setUniqueID("OFF_FIELD_99");

        Application app = application(107L);
        VerificationWorkflow wf = unassignedWorkflow(app, WorkflowStage.FIELD_OFFICER);

        when(applicationRepository.findById(107L)).thenReturn(Optional.of(app));
        when(workflowRepository.findByApplicationId(107L)).thenReturn(Optional.of(wf));
        when(userRepo.findByuniqueID("OFF_FIELD_99")).thenReturn(Optional.of(officer));
        when(workflowRepository.countActiveAssignmentsByOfficer(1L)).thenReturn(0L);

        ApplicationAllocationRequestDTO req = new ApplicationAllocationRequestDTO();
        req.setApplicationId(107L);
        req.setOfficerId("OFF_FIELD_99");

        ApplicationAllocationResponseDTO res = allocationService.allocateApplicationToOfficer(req, admin);

        assertTrue(res.isStatus());
        assertEquals("OFF_FIELD_99", res.getOfficerId());
        verify(workflowRepository).save(wf);
        verify(applicationRepository).save(app);
    }
}

