package com.example.gov_scheme_backend.dto.response.application;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationAllocationResponseDTO {
    private boolean status;
    private String message;
    private Long applicationId;
    private String officerId;
    private String officerName;
    private String currentStage;
    private String applicationStatus;
}
