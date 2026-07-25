package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeEligibilityRuleRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeEligibilityRuleResponseDTO;

import java.util.List;

public interface SchemeEligibilityRuleService {

    SchemeEligibilityRuleResponseDTO addRule(
            SchemeEligibilityRuleRequestDTO request);

    List<SchemeEligibilityRuleResponseDTO> getRulesByScheme(
            Integer schemeId);

    void deleteRule(Long id);
}