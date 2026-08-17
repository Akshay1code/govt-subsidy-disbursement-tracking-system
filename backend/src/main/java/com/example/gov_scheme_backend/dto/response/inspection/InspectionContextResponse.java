package com.example.gov_scheme_backend.dto.response.inspection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InspectionContextResponse {
    private Long applicationId;
    private String applicationCode;
    private String beneficiaryName;
    private String schemeName;
    private String inspectionLocation;
    private String district;
    private String state;
    // Pre-fill from latest inspection if one exists
    private Boolean addressVerified;
    private Boolean businessActivityConfirmed;
    private Boolean assetsInspected;
    private String notes;
    private List<String> evidenceMediaIds;
    private LocalDateTime lastSubmittedAt;
}
