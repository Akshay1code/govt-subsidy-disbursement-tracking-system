package com.example.gov_scheme_backend.dto.request.application;

import com.example.gov_scheme_backend.enums.RuleField;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FieldValueRequestDTO {
    private RuleField fieldName;
    private String value;
}
