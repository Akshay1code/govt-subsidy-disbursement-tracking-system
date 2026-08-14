package com.example.gov_scheme_backend.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeWiseSummaryDTO {

    private String schemeName;

    private Long totalApplications;

    private Double approvedAmount;

    private Double disbursedAmount;

    private Double remainingBudget;

    private Double utilizationPercent;

    private Boolean exhaustionWarning;
}