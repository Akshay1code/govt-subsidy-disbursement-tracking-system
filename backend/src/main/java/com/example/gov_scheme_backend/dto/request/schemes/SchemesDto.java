package com.example.gov_scheme_backend.dto.request.schemes;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SchemesDto {

    private String schemeCode;

    private String schemeName;

    private String description;

    private Double allocatedFunds;

    private Double minimumEligibleScore;

    private Boolean active;

    private Integer categoryId;
}