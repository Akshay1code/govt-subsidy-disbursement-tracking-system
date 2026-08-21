package com.example.gov_scheme_backend.dto.request.application;

import com.example.gov_scheme_backend.enums.WorkflowStage;
import lombok.Data;

@Data
public class BatchAllocationRequestDTO {
    private int count;
    private WorkflowStage stage;
}
