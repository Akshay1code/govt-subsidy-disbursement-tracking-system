package com.example.gov_scheme_backend.dto.response;

import lombok.Data;

@Data
public class ApplicationFieldValueResponseDTO {

    private Long id;

    private Long applicationId;

    private String fieldName;

    private String fieldValue;
}