package com.example.gov_scheme_backend.dto.response.schemes;

import lombok.Data;

import java.util.List;

@Data
public class SchemeResponseDTO {
    private Long id;
    private String schemeCode;
    private String schemeName;
    private String description;
    private java.math.BigDecimal benefit;
    private Double allocatedFunds;
    private Double budgetUsed;
    private Double remainingFunds;
    private Double minimumEligibleScore;
    private Boolean active;
    private String categoryName;
    private String categoryDescription;
    private List<SchemeEligibilityRuleResponseDTO> rules;
    private List<SchemeRequiredDocumentResponseDTO> documents;
    private List<SchemeRequiredFieldResponseDTO> fields;
}
