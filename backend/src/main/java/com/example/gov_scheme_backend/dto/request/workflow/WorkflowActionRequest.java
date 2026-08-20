package com.example.gov_scheme_backend.dto.request.workflow;

import com.example.gov_scheme_backend.enums.WorkflowAction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WorkflowActionRequest {

    @NotNull(message = "Action is required")
    private WorkflowAction action;

    private String remarks;

    // Used only when Finance Officer approves
    private Double approvedAmount;

    // Used only when Finance Officer approves — how many installments to split the grant into
    private Integer numberOfInstallments;
}