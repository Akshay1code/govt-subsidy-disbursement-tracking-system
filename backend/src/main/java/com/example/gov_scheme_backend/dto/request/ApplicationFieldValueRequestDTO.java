package com.example.gov_scheme_backend.dto.request;

import lombok.Data;

@Data
public class ApplicationFieldValueRequestDTO {

    private String fieldName;

    private String fieldValue;
}