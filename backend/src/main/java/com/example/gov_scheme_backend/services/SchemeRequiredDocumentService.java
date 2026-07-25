package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredDocumentRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredDocumentResponseDTO;

import java.util.List;

public interface SchemeRequiredDocumentService {

    SchemeRequiredDocumentResponseDTO addDocument(
            SchemeRequiredDocumentRequestDTO request
    );

    List<SchemeRequiredDocumentResponseDTO> getDocumentsByScheme(
            Integer schemeId
    );

    void deleteDocument(Long id);
}