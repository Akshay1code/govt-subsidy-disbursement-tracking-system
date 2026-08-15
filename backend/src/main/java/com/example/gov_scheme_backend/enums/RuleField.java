package com.example.gov_scheme_backend.enums;

public enum RuleField {

    AGE(FieldType.NUMBER),

    ANNUAL_INCOME(FieldType.NUMBER),

    LAND_AREA(FieldType.NUMBER),

    OCCUPATION(FieldType.STRING),

    CASTE(FieldType.STRING),

    STATE(FieldType.STRING),

    GENDER(FieldType.STRING);

    private final FieldType type;

    RuleField(FieldType type) {
        this.type = type;
    }

    public FieldType getType() {
        return type;
    }
}