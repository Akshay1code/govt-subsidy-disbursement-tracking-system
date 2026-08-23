package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.WorkflowStage;

import com.example.gov_scheme_backend.dto.response.application.AllocationStageSummaryResponse;
import com.example.gov_scheme_backend.dto.response.application.OfficerCapacityResponse;
import java.util.List;

public interface AllocationService {
    List<OfficerWorkloadDTO> getAvailableOfficers(WorkflowStage stage);
    BatchAllocationResponseDTO batchAllocate(BatchAllocationRequestDTO request, Users currentUser);
    
    List<AllocationStageSummaryResponse> getAllocationStageSummary();
    List<OfficerCapacityResponse> getOfficerCapacities(WorkflowStage stage);
    void updateOfficerCapacity(Long officerId, int capacity);
}
