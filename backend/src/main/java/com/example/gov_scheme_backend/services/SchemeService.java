package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeCategoryRequestDTO;
import com.example.gov_scheme_backend.dto.request.schemes.SchemeEligibilityRuleRequestDTO;
import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredFieldRequestDTO;
import com.example.gov_scheme_backend.dto.request.schemes.SchemesDto;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeCategoryResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeEligibilityRuleResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredFieldResponseDTO;

import java.util.List;

public interface SchemeService {
    public ApiResponse addService(SchemesDto req);
    SchemeRequiredFieldResponseDTO addField(
            SchemeRequiredFieldRequestDTO request);

    List<SchemeRequiredFieldResponseDTO> getFieldsByScheme(
            Integer schemeId);

    void deleteField(Long id);

    SchemeEligibilityRuleResponseDTO addRule(
            SchemeEligibilityRuleRequestDTO request);

    List<SchemeEligibilityRuleResponseDTO> getRulesByScheme(
            Integer schemeId);

    void deleteRule(Long id);

//    SchemeCategoryResponseDTO createCategory(SchemeCategoryRequestDTO request);
//
//    List<SchemeCategoryResponseDTO> getAllCategories();
//
//    SchemeCategoryResponseDTO getCategory(Integer id);
//
//    SchemeCategoryResponseDTO updateCategory(Integer id,
//                                             SchemeCategoryRequestDTO request);
//
//    void deleteCategory(Integer id);
}
