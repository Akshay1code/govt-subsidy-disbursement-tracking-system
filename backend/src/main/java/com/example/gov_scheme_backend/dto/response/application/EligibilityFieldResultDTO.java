package com.example.gov_scheme_backend.dto.response.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EligibilityFieldResultDTO {
    private String fieldName;
    private String operator;
    private String expectedValue;
    private String userValue;
    private double pointsAwarded;
    private double pointsPossible;
    private boolean partialCredit;
    @JsonProperty("ruleMet")
    private boolean ruleMet;
    private String requirementDescription;
    private String scoreDescription;
}
