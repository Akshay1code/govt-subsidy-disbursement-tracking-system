package com.example.gov_scheme_backend.dto.response;

import com.example.gov_scheme_backend.enums.DocumentType;
import lombok.Data;

@Data
public class SchemeRequiredDocumentResponseDTO {

    private Long id;

    private Integer schemeId;

    private DocumentType documentType;

    private Boolean mandatory;
}