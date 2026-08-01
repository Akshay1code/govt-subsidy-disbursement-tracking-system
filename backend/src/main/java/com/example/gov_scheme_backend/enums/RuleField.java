package com.example.gov_scheme_backend.enums;
public enum RuleField {

    AGE(FieldType.NUMBER),

    INCOME(FieldType.NUMBER),

    CGPA(FieldType.NUMBER),

    CASTE(FieldType.STRING),

    STATE(FieldType.STRING),

    GENDER(FieldType.STRING),;

    private final FieldType type;

    RuleField(FieldType type) {
        this.type = type;
    }

    public FieldType getType() {
        return type;
    }
}