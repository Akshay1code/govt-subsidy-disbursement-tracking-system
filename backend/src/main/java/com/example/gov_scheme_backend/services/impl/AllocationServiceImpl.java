package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.AuditAction;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.services.AllocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllocationServiceImpl implements AllocationService {

    private final UserRepo userRepo;
    private final VerificationWorkflowRepository workflowRepository;
    private final AuditLogRepo auditLogRepository;

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

            selectedOfficerInfo.setAllocatedCount(selectedOfficerInfo.getAllocatedCount() + 1);
            selectedOfficerInfo.setRemainingCapacity(selectedOfficerInfo.getRemainingCapacity() - 1);
            actuallyAllocated++;

            // Create Audit Log
            AuditLog log = AuditLog.builder()
                    .auditId("AUD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .user(currentUser)
                    .action(AuditAction.ALLOCATE)
                    .description("Application #" + workflow.getApplication().getId() + " allocated to Officer #" + selectedOfficer.getId() + " via Batch FCFS")
                    .build();
            auditLogRepository.save(log);
        }

        String msg = actuallyAllocated == request.getCount()
                ? actuallyAllocated + " applications allocated successfully."
                : "Partial allocation: Only " + actuallyAllocated + " applications could be allocated out of " + request.getCount() + " requested due to capacity or queue limits.";

        return new BatchAllocationResponseDTO(request.getCount(), actuallyAllocated, msg);
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
