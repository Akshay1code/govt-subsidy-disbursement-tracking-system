package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.SchemeRequiredFieldRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeRequiredFieldResponseDTO;

import java.util.List;

public interface SchemeRequiredFieldService {

    SchemeRequiredFieldResponseDTO addField(
            SchemeRequiredFieldRequestDTO request);

    List<SchemeRequiredFieldResponseDTO> getFieldsByScheme(
            Integer schemeId);

    void deleteField(Long id);
}