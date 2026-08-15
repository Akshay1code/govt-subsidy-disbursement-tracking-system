package com.example.gov_scheme_backend.dto.response.workflow;

import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkflowResponse {

    private Long applicationId;

    private WorkflowStage currentStage;

    private ApplicationStatus applicationStatus;

    private String message;
}