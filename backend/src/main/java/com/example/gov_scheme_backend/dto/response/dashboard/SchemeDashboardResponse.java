package com.example.gov_scheme_backend.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchemeDashboardResponse {

    private String schemeCode;
    private String schemeName;

    private Double allocatedFunds;
    private Double budgetUsed;
    private Double remainingFunds;
    private Double utilizationPercentage;
}