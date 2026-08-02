package com.example.gov_scheme_backend.dto.request.application;

import com.example.gov_scheme_backend.enums.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class ApplicationDocumentRequestDTO {

    private DocumentType documentType;

    private String fileName;

    private String filePath;
}
