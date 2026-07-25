package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredFieldRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredFieldResponseDTO;
import com.example.gov_scheme_backend.entities.SchemeRequiredField;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.repositories.SchemeRequiredFieldRepository;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.services.SchemeRequiredFieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchemeRequiredFieldServiceImpl implements SchemeRequiredFieldService {

    private final SchemeRequiredFieldRepository fieldRepository;
    private final SchemeRepo schemeRepo;

    @Override
    public SchemeRequiredFieldResponseDTO addField(
            SchemeRequiredFieldRequestDTO request) {

        Schemes scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() ->
                        new RuntimeException("Scheme not found"));

        SchemeRequiredField field = new SchemeRequiredField();

        field.setScheme(scheme);
        field.setFieldName(request.getFieldName());
        field.setMandatory(request.getMandatory());

        SchemeRequiredField saved = fieldRepository.save(field);

        return mapToResponse(saved);
    }

    @Override
    public List<SchemeRequiredFieldResponseDTO> getFieldsByScheme(
            Integer schemeId) {

        return fieldRepository.findBySchemeId(schemeId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteField(Long id) {

        fieldRepository.deleteById(id);

    }

    private SchemeRequiredFieldResponseDTO mapToResponse(
            SchemeRequiredField field) {

        SchemeRequiredFieldResponseDTO response =
                new SchemeRequiredFieldResponseDTO();

        response.setId(field.getId());
        response.setSchemeId(field.getScheme().getId());
        response.setFieldName(field.getFieldName());
        response.setMandatory(field.getMandatory());

        return response;
    }
}