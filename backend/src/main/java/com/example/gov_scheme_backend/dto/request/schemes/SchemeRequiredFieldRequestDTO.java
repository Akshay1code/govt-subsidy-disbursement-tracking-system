package com.example.gov_scheme_backend.dto.request.schemes;

import com.example.gov_scheme_backend.enums.ApplicationField;
import lombok.Data;

@Data
public class SchemeRequiredFieldRequestDTO {

    private Integer schemeId;

    private ApplicationField fieldName;

    private Boolean mandatory;
}