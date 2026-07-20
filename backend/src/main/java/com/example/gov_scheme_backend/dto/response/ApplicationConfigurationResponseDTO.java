package com.example.gov_scheme_backend.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class ApplicationConfigurationResponseDTO {

    private Integer schemeId;

    private String schemeName;

    private List<SchemeRequiredFieldResponseDTO> requiredFields;

    private List<SchemeRequiredDocumentResponseDTO> requiredDocuments;

}