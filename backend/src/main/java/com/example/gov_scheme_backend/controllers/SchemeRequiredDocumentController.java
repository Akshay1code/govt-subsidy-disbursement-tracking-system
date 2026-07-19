package com.example.gov_scheme_backend.controllers;


import com.example.gov_scheme_backend.dto.request.SchemeRequiredDocumentRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeRequiredDocumentResponseDTO;
import com.example.gov_scheme_backend.services.SchemeRequiredDocumentService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/scheme-documents")
@RequiredArgsConstructor
public class SchemeRequiredDocumentController {


    private final SchemeRequiredDocumentService service;


    @PostMapping
    public SchemeRequiredDocumentResponseDTO addDocument(
            @RequestBody SchemeRequiredDocumentRequestDTO request) {

        return service.addDocument(request);
    }


    @GetMapping("/scheme/{schemeId}")
    public List<SchemeRequiredDocumentResponseDTO> getDocuments(
            @PathVariable Integer schemeId) {

        return service.getDocumentsByScheme(schemeId);
    }


    @DeleteMapping("/{id}")
    public String deleteDocument(
            @PathVariable Long id) {

        service.deleteDocument(id);

        return "Document removed successfully";
    }
}