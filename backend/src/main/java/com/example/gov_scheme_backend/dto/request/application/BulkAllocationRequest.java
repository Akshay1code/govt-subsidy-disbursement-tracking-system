package com.example.gov_scheme_backend.dto.request.application;

import com.example.gov_scheme_backend.enums.WorkflowStage;
import lombok.Data;

@Data
public class BulkAllocationRequest {
    private String officerId;      // uniqueID (e.g. "OFFI-XXXX") or numeric DB id, as a string
    private WorkflowStage stage;
    private Integer count;
}
