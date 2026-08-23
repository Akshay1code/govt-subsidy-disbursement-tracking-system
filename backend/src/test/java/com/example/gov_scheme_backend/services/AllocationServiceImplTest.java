package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.services.NotificationService;
import com.example.gov_scheme_backend.services.impl.AllocationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
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
}
