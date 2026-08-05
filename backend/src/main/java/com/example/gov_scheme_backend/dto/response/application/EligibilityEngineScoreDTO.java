package com.example.gov_scheme_backend.dto.response.application;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EligibilityEngineScoreDTO {
    private boolean status;
    private double score;
    private String message;
}
