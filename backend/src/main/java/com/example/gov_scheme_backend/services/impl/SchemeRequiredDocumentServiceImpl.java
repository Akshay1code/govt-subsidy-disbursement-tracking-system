package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.SchemeRequiredDocumentRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeRequiredDocumentResponseDTO;
import com.example.gov_scheme_backend.entities.SchemeRequiredDocument;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.SchemeRequiredDocumentRepository;
import com.example.gov_scheme_backend.repositories.SchemeRepo;

import com.example.gov_scheme_backend.services.SchemeRequiredDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchemeRequiredDocumentServiceImpl
        implements SchemeRequiredDocumentService {


    private final SchemeRequiredDocumentRepository documentRepository;

    private final SchemeRepo schemeRepo;


    @Override
    public SchemeRequiredDocumentResponseDTO addDocument(
            SchemeRequiredDocumentRequestDTO request) {


        Schemes scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Scheme not found"));


        SchemeRequiredDocument document =
                new SchemeRequiredDocument();

        document.setScheme(scheme);
        document.setDocumentType(request.getDocumentType());
        document.setMandatory(request.getMandatory());


        SchemeRequiredDocument saved =
                documentRepository.save(document);


        return mapToResponse(saved);
    }


    @Override
    public List<SchemeRequiredDocumentResponseDTO> getDocumentsByScheme(
            Integer schemeId) {

        return documentRepository.findBySchemeId(schemeId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    @Override
    public void deleteDocument(Long id) {

        documentRepository.deleteById(id);

    }


    private SchemeRequiredDocumentResponseDTO mapToResponse(
            SchemeRequiredDocument document) {


        SchemeRequiredDocumentResponseDTO response =
                new SchemeRequiredDocumentResponseDTO();


        response.setId(document.getId());

        response.setSchemeId(
                document.getScheme().getId()
        );

        response.setDocumentType(
                document.getDocumentType()
        );

        response.setMandatory(
                document.getMandatory()
        );


        return response;
    }
}