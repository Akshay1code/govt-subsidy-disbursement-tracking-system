package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeEligibilityRuleRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeEligibilityRuleResponseDTO;
import com.example.gov_scheme_backend.services.SchemeEligibilityRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eligibility-rules")
@RequiredArgsConstructor
public class SchemeEligibilityRuleController {

    private final SchemeEligibilityRuleService service;

    @PostMapping
    public SchemeEligibilityRuleResponseDTO addRule(
            @RequestBody SchemeEligibilityRuleRequestDTO request) {

        return service.addRule(request);
    }

    @GetMapping("/scheme/{schemeId}")
    public List<SchemeEligibilityRuleResponseDTO> getRules(
            @PathVariable Integer schemeId) {

        return service.getRulesByScheme(schemeId);
    }

    @DeleteMapping("/{id}")
    public String deleteRule(@PathVariable Long id) {

        service.deleteRule(id);

        return "Rule deleted successfully";
    }
}