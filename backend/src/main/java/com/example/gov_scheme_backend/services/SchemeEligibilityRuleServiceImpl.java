package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.SchemeEligibilityRuleRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeEligibilityRuleResponseDTO;
import com.example.gov_scheme_backend.entities.SchemeEligibilityRule;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.repositories.SchemeEligibilityRuleRepository;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchemeEligibilityRuleServiceImpl implements SchemeEligibilityRuleService {

    private final SchemeEligibilityRuleRepository ruleRepository;
    private final SchemeRepo schemeRepo;

    @Override
    public SchemeEligibilityRuleResponseDTO addRule(
            SchemeEligibilityRuleRequestDTO request) {

        Schemes scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        SchemeEligibilityRule rule = new SchemeEligibilityRule();

        rule.setScheme(scheme);
        rule.setFieldName(request.getFieldName());
        rule.setOperator(request.getOperator());
        rule.setExpectedValue(request.getExpectedValue());
        rule.setPoints(request.getPoints());

        SchemeEligibilityRule saved = ruleRepository.save(rule);

        return mapToResponse(saved);
    }

    @Override
    public List<SchemeEligibilityRuleResponseDTO> getRulesByScheme(Integer schemeId) {

        return ruleRepository.findBySchemeId(schemeId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteRule(Long id) {

        ruleRepository.deleteById(id);

    }

    private SchemeEligibilityRuleResponseDTO mapToResponse(
            SchemeEligibilityRule rule) {

        SchemeEligibilityRuleResponseDTO response =
                new SchemeEligibilityRuleResponseDTO();

        response.setId(rule.getId());
        response.setSchemeId(rule.getScheme().getId());
        response.setFieldName(rule.getFieldName());
        response.setOperator(rule.getOperator());
        response.setExpectedValue(rule.getExpectedValue());
        response.setPoints(rule.getPoints());

        return response;
    }
}