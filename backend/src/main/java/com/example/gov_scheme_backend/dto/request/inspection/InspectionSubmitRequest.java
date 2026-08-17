package com.example.gov_scheme_backend.dto.request.inspection;

import lombok.Data;
import java.util.List;

@Data
public class InspectionSubmitRequest {
    private Long applicationId;
    private Boolean addressVerified;
    private Boolean businessActivityConfirmed;
    private Boolean assetsInspected;
    private String notes;
    private List<String> evidenceMediaIds;
}
