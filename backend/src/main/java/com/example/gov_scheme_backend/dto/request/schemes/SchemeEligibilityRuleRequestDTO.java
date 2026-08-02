package com.example.gov_scheme_backend.dto.request.schemes;

import com.example.gov_scheme_backend.enums.RuleField;
import com.example.gov_scheme_backend.enums.RuleOperator;
import lombok.Data;

@Data
public class SchemeEligibilityRuleRequestDTO {

    private Integer schemeId;

    private RuleField fieldName;

    private RuleOperator operator;

    private String expectedValue;

    private Integer points;
}