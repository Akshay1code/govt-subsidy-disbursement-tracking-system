package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.SchemeRequiredDocumentRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeRequiredDocumentResponseDTO;

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