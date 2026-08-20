package com.example.gov_scheme_backend.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceDashboardResponse {

    private Long totalApplications;
    private Long approvedApplications;
    private Long rejectedApplications;
    private Long underReviewApplications;
    private Long disbursedApplications;
    private Long awaitingDisbursementApplications;
    private Long flaggedMilestones;
    private Double avgApprovalDays;
    private Double avgDisbursementDays;
    private Double missingDocsPct;
}