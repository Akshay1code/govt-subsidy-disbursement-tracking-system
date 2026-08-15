package com.example.gov_scheme_backend.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceMetricsDTO {

    private Double avgApprovalDays;

    private Double complianceRate;

    private Long overdueCount;
}