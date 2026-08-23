package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.dto.response.application.AllocationStageSummaryResponse;
import com.example.gov_scheme_backend.dto.response.application.OfficerCapacityResponse;
import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.enums.NotificationType;
import com.example.gov_scheme_backend.enums.AuditAction;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.services.AllocationService;
import com.example.gov_scheme_backend.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllocationServiceImpl implements AllocationService {

    private final UserRepo userRepo;
    private final VerificationWorkflowRepository workflowRepository;
    private final com.example.gov_scheme_backend.repositories.ApplicationRepo applicationRepository;
    private final AuditLogRepo auditLogRepository;
    private final NotificationService notificationService;

    @Override
    public List<OfficerWorkloadDTO> getAvailableOfficers(WorkflowStage stage) {
        Role targetRole = getRoleForStage(stage);
        List<Users> officers = userRepo.findByRole(targetRole);

        return officers.stream().map(officer -> {
            long activeAssignments = workflowRepository.countActiveAssignmentsByOfficer(officer.getId());
            int capacity = officer.getAllocationCapacity() != null ? officer.getAllocationCapacity() : 10;
            return OfficerWorkloadDTO.builder()
                    .officerId(officer.getId())
                    .officerName(officer.getFullName())
                    .role(officer.getRole().name())
                    .allocatedCount(activeAssignments)
                    .capacity(capacity)
                    .remainingCapacity(Math.max(0, capacity - (int) activeAssignments))
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BatchAllocationResponseDTO batchAllocate(BatchAllocationRequestDTO request, Users currentUser) {
        List<OfficerWorkloadDTO> availableOfficers = getAvailableOfficers(request.getStage())
                .stream()
                .filter(o -> o.getRemainingCapacity() > 0)
                .collect(Collectors.toList());

        int totalAvailableCapacity = availableOfficers.stream()
                .mapToInt(OfficerWorkloadDTO::getRemainingCapacity)
                .sum();

        if (totalAvailableCapacity == 0) {
            return new BatchAllocationResponseDTO(request.getCount(), 0, "No officers have available capacity for this stage.");
        }

        int allocatableCount = Math.min(request.getCount(), totalAvailableCapacity);

        Page<VerificationWorkflow> workflowsToAssign = workflowRepository.findOldestUnassignedWorkflowsByStageWithLock(
                request.getStage(),
                PageRequest.of(0, allocatableCount)
        );

        int actuallyAllocated = 0;

        for (VerificationWorkflow workflow : workflowsToAssign.getContent()) {
            // Find officer with the lowest allocated count who still has remaining capacity.
            // Tie-break on officerId so the choice is deterministic when two officers
            // are carrying the same load (mirrors the FCFS id tie-breaker on the queue).
            OfficerWorkloadDTO selectedOfficerInfo = availableOfficers.stream()
                    .filter(o -> o.getRemainingCapacity() > 0)
                    .min(Comparator.comparingLong(OfficerWorkloadDTO::getAllocatedCount)
                            .thenComparing(OfficerWorkloadDTO::getOfficerId))
                    .orElse(null);

            if (selectedOfficerInfo == null) {
                break; // Should not happen due to prior capacity check, but safe guard
            }

            Users selectedOfficer = userRepo.findById(selectedOfficerInfo.getOfficerId())
                    .orElseThrow(() -> new RuntimeException("Officer not found"));

            workflow.setAssignedOfficer(selectedOfficer);
            workflowRepository.save(workflow);

            // Explicitly save the Application so allocated_officer_id is persisted
            Application allocatedApp = workflow.getApplication();
            allocatedApp.setAllocatedOfficer(selectedOfficer);
            applicationRepository.save(allocatedApp);

            selectedOfficerInfo.setAllocatedCount(selectedOfficerInfo.getAllocatedCount() + 1);
            selectedOfficerInfo.setRemainingCapacity(selectedOfficerInfo.getRemainingCapacity() - 1);
            actuallyAllocated++;

            // Create and push real-time notification to the officer who just
            // received this application via FCFS allocation.
            notificationService.createAndPublishNotification(
                    selectedOfficer,
                    "A new application (" + workflow.getApplication().getApplicationCode() + ") has been allocated to you via FCFS.",
                    NotificationType.APPLICATION_ASSIGNED,
                    null,
                    workflow.getApplication().getId()
            );

            // Create Audit Log
            AuditLog log = AuditLog.builder()
                    .auditId("AUD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .user(currentUser)
                    .action(AuditAction.ALLOCATE)
                    .description("Application #" + workflow.getApplication().getId() + " allocated to Officer #" + selectedOfficer.getId() + " via Batch FCFS")
                    .build();
            auditLogRepository.save(log);
        }

        // We already returned early when there was zero officer capacity, so a zero
        // result here can only mean the allocation queue was empty. Say that plainly
        // instead of the old vague "due to capacity or queue limits", which left the
        // admin unable to tell whether officers were full or nothing was submitted.
        String msg;
        if (actuallyAllocated == request.getCount()) {
            msg = actuallyAllocated + " application(s) allocated successfully.";
        } else if (actuallyAllocated == 0) {
            msg = "No applications are currently awaiting allocation at this stage. "
                    + "Only submitted applications enter the allocation queue — "
                    + "drafts and unsubmitted applications do not.";
        } else {
            msg = "Partial allocation: " + actuallyAllocated + " of " + request.getCount()
                    + " application(s) were allocated. The rest are waiting because the "
                    + "queue is now empty or officers have no remaining capacity.";
        }

        return new BatchAllocationResponseDTO(request.getCount(), actuallyAllocated, msg);
    }

    @Override
    public List<AllocationStageSummaryResponse> getAllocationStageSummary() {
        List<AllocationStageSummaryResponse> response = new ArrayList<>();
        for (WorkflowStage stage : new WorkflowStage[]{
                WorkflowStage.FIELD_OFFICER, WorkflowStage.DISTRICT_OFFICER,
                WorkflowStage.REGIONAL_OFFICER, WorkflowStage.FINANCE_OFFICER}) {

            // Count the applications that can ACTUALLY be allocated right now: the
            // unassigned verification workflows at this stage. This is the exact same
            // source of truth the batch engine pulls from
            // (findOldestUnassignedWorkflowsByStageWithLock uses the identical
            // "assignedOfficer IS NULL AND currentStage = :stage" predicate), so the
            // "awaiting allocation" number the admin sees always matches what a batch
            // run can assign.
            //
            // The previous implementation counted the Application table by ReviewStage
            // (countByStageAndAllocatedOfficerIsNull). That over-counted, because
            // Application.stage defaults to FIELD for EVERY application — including
            // DRAFT/PENDING ones the beneficiary never submitted, which have no
            // workflow row. The mismatch produced the "shows 1 awaiting, allocates 0"
            // bug: the button was enabled off the inflated count, but the engine found
            // no workflow to assign.
            long count = workflowRepository.countByCurrentStageAndAssignedOfficerIsNull(stage);
            response.add(new AllocationStageSummaryResponse(stage.name(), count));
        }
        return response;
    }

    @Override
    public List<OfficerCapacityResponse> getOfficerCapacities(WorkflowStage stage) {
        Role targetRole = getRoleForStage(stage);
        List<Users> officers = userRepo.findByRole(targetRole);

        return officers.stream().map(o -> {
            long current = workflowRepository.countByAssignedOfficer(o);
            int capacity = o.getAllocationCapacity() != null ? o.getAllocationCapacity() : 10;
            int remaining = Math.max(0, capacity - (int) current);
            return new OfficerCapacityResponse(
                    o.getId(), o.getUniqueID(), o.getFullName(), targetRole.name(),
                    capacity, current, remaining);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateOfficerCapacity(Long officerId, int capacity) {
        Users officer = userRepo.findById(officerId)
                .orElseThrow(() -> new RuntimeException("Officer not found with id: " + officerId));
        officer.setAllocationCapacity(capacity);
        userRepo.save(officer);
    }

    private Role getRoleForStage(WorkflowStage stage) {
        if (stage == null) return null;
        switch (stage) {
            case FIELD_OFFICER: return Role.FIELD_OFFICER;
            case DISTRICT_OFFICER: return Role.DISTRICT_OFFICER;
            case REGIONAL_OFFICER: return Role.REGIONAL_OFFICER;
            case FINANCE_OFFICER: return Role.FINANCE_OFFICER;
            default: throw new IllegalArgumentException("Unknown stage: " + stage);
        }
    }
}
