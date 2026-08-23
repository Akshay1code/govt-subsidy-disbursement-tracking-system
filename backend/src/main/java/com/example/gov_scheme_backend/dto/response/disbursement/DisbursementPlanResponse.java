package com.example.gov_scheme_backend.dto.response.disbursement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlanResponse {
    private Long planId;
    private Long applicationId;
    private BigDecimal totalAmount;
    private Integer totalStages;
    private List<DisbursementMilestoneResponse> milestones;
}
