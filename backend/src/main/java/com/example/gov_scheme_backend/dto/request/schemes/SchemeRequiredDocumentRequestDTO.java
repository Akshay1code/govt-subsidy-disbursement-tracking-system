package com.example.gov_scheme_backend.dto.request.schemes;

import com.example.gov_scheme_backend.enums.DocumentType;
import lombok.Data;

@Data
public class SchemeRequiredDocumentRequestDTO {

    private Integer schemeId;

    private DocumentType documentType;

    private Boolean mandatory;
}