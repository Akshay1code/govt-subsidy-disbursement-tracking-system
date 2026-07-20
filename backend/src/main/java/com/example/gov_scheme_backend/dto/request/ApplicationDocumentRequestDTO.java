package com.example.gov_scheme_backend.dto.request;

import com.example.gov_scheme_backend.enums.DocumentType;
import lombok.Data;

@Data
public class ApplicationDocumentRequestDTO {

    private DocumentType documentType;

    private String fileName;

    private String filePath;
}