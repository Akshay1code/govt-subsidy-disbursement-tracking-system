package com.example.gov_scheme_backend.dto.response.schemes;

import com.example.gov_scheme_backend.enums.ApplicationField;
import lombok.Data;

@Data
public class SchemeRequiredFieldResponseDTO {

    private Long id;

    private Integer schemeId;

    private ApplicationField fieldName;

    private Boolean mandatory;
}