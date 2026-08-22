package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeEligibilityRuleRequestDTO;
import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredDocumentRequestDTO;
import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredFieldRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.schemes.SchemesDto;
import com.example.gov_scheme_backend.entities.SchemeCategory;
import com.example.gov_scheme_backend.entities.SchemeEligibilityRule;
import com.example.gov_scheme_backend.entities.SchemeRequiredDocument;
import com.example.gov_scheme_backend.entities.SchemeRequiredField;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.enums.RuleKey;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.gov_scheme_backend.repositories.SchemeCategoryRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.example.gov_scheme_backend.dto.response.schemes.SchemeEligibilityRuleResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredDocumentResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredFieldResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeResponseDTO;

@Service
public class SchemeServiceImpl {
    @Autowired
    SchemeRepo schemeRepo;
    @Autowired
    SchemeCategoryRepository schemeCategoryRepository;
    @Autowired
    private com.example.gov_scheme_backend.repositories.AuditLogRepo auditLogRepo;
    @Autowired
    private com.example.gov_scheme_backend.repositories.UserRepo userRepo;

    @Transactional(readOnly = true)
    public List<SchemeResponseDTO> getAllSchemes() {
        return schemeRepo.findAll().stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SchemeResponseDTO> getSchemesByCategory(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return getAllSchemes();
        }

        return schemeRepo.findByCategory_CategoryNameIgnoreCase(categoryName.trim()).stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ApiResponse addService(SchemesDto req) {

        if (req == null ||
                req.getSchemeName() == null ||
                req.getDescription() == null) {

            return new ApiResponse(false, "Required fields are missing");
        }

        if (req.getAllocatedFunds() == null || req.getAllocatedFunds() <= 0) {
            return new ApiResponse(false, "Allocated funds must be greater than zero");
        }

        SchemeCategory category = resolveCategory(req.getCategoryName());

        Schemes scheme = new Schemes();

        // Use the code sent by admin, otherwise generate one
        if (req.getSchemeCode() == null || req.getSchemeCode().isBlank()) {
            scheme.setSchemeCode("SCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        } else {
            scheme.setSchemeCode(req.getSchemeCode());
        }

        scheme.setSchemeName(req.getSchemeName());
        scheme.setDescription(req.getDescription());
        scheme.setBenefit(req.getBenefit());
        scheme.setAllocatedFunds(req.getAllocatedFunds());
        scheme.setMinimumEligibleScore(req.getMinimumEligibleScore());
        scheme.setActive(req.getActive() == null ? true : req.getActive());
        scheme.setCategory(category);
        scheme.setBudgetUsed(0.0);

        List<SchemeEligibilityRule> rules = buildRules(req.getRules(), scheme);
        List<SchemeRequiredDocument> documents = buildDocuments(req.getDocuments(), scheme);
        List<SchemeRequiredField> fields = buildFields(req.getFields(), scheme);

        scheme.setEligibilityRules(rules);
        scheme.setRequiredDocuments(documents);
        scheme.setRequiredFields(fields);

        schemeRepo.save(scheme);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = userRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.CREATE)
                .description("Created scheme with code: " + scheme.getSchemeCode() + " and name: " + scheme.getSchemeName())
                .build();
        auditLogRepo.save(audit);

        return new ApiResponse(true, "Scheme and related configuration saved successfully");
    }

    @Transactional
    public ApiResponse updateService(String schemeCode, SchemesDto req) {
        if (schemeCode == null || schemeCode.isBlank()) {
            return new ApiResponse(false, "Scheme code is required for update");
        }
        if (req == null ||
                req.getSchemeName() == null ||
                req.getDescription() == null) {
            return new ApiResponse(false, "Required fields are missing");
        }
        if (req.getAllocatedFunds() == null || req.getAllocatedFunds() <= 0) {
            return new ApiResponse(false, "Allocated funds must be greater than zero");
        }

        Schemes scheme = schemeRepo.findBySchemeCode(schemeCode.trim()).orElse(null);
        if (scheme == null) {
            return new ApiResponse(false, "Scheme not found");
        }

        if (req.getSchemeCode() != null && !req.getSchemeCode().isBlank()
                && !schemeCode.trim().equalsIgnoreCase(req.getSchemeCode().trim())) {
            return new ApiResponse(false, "Scheme code cannot be changed");
        }

        SchemeCategory category = resolveCategory(req.getCategoryName());

        scheme.setSchemeName(req.getSchemeName());
        scheme.setDescription(req.getDescription());
        scheme.setBenefit(req.getBenefit());
        scheme.setAllocatedFunds(req.getAllocatedFunds());
        scheme.setMinimumEligibleScore(req.getMinimumEligibleScore());
        scheme.setActive(req.getActive() == null ? true : req.getActive());
        scheme.setCategory(category);

        List<SchemeEligibilityRule> rules = buildRules(req.getRules(), scheme);
        List<SchemeRequiredDocument> documents = buildDocuments(req.getDocuments(), scheme);
        List<SchemeRequiredField> fields = buildFields(req.getFields(), scheme);

        if (scheme.getEligibilityRules() == null) {
            scheme.setEligibilityRules(new ArrayList<>());
        }
        if (scheme.getRequiredDocuments() == null) {
            scheme.setRequiredDocuments(new ArrayList<>());
        }
        if (scheme.getRequiredFields() == null) {
            scheme.setRequiredFields(new ArrayList<>());
        }

        scheme.getEligibilityRules().clear();
        scheme.getEligibilityRules().addAll(rules);

        scheme.getRequiredDocuments().clear();
        scheme.getRequiredDocuments().addAll(documents);

        scheme.getRequiredFields().clear();
        scheme.getRequiredFields().addAll(fields);

        schemeRepo.save(scheme);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = userRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Updated scheme with code: " + scheme.getSchemeCode())
                .build();
        auditLogRepo.save(audit);

        return new ApiResponse(true, "Scheme updated successfully");
    }

    private RuleKey resolveRuleKey(com.example.gov_scheme_backend.enums.RuleField fieldName) {
        if (fieldName == null) {
            return RuleKey.AGE;
        }

        return switch (fieldName) {
            case AGE -> RuleKey.AGE;
            case ANNUAL_INCOME -> RuleKey.ANNUAL_INCOME;
            case LAND_AREA -> RuleKey.LAND_AREA;
            case OCCUPATION -> RuleKey.OCCUPATION;
            case CASTE -> RuleKey.CASTE;
            case STATE -> RuleKey.STATE;
            case GENDER -> RuleKey.GENDER;
        };
    }

    private SchemeCategory resolveCategory(String categoryName) {
        String resolvedCategoryName = (categoryName == null || categoryName.isBlank())
                ? "General"
                : categoryName.trim();

        return schemeCategoryRepository.findByCategoryNameIgnoreCase(resolvedCategoryName)
                .orElseGet(() -> {
                    SchemeCategory category = new SchemeCategory();
                    category.setCategoryName(resolvedCategoryName);
                    category.setDescription(resolvedCategoryName + " schemes");
                    category.setActive(true);
                    return schemeCategoryRepository.save(category);
                });
    }

    private List<SchemeEligibilityRule> buildRules(List<SchemeEligibilityRuleRequestDTO> requests, Schemes scheme) {
        List<SchemeEligibilityRule> rules = new ArrayList<>();
        if (requests == null) {
            return rules;
        }

        for (SchemeEligibilityRuleRequestDTO ruleRequest : requests) {
            if (ruleRequest == null
                    || ruleRequest.getFieldName() == null
                    || ruleRequest.getOperator() == null
                    || ruleRequest.getExpectedValue() == null
                    || ruleRequest.getExpectedValue().isBlank()) {
                continue;
            }

            SchemeEligibilityRule rule = new SchemeEligibilityRule();
            rule.setScheme(scheme);
            rule.setFieldName(ruleRequest.getFieldName());
            rule.setOperator(ruleRequest.getOperator());
            rule.setExpectedValue(ruleRequest.getExpectedValue());
            rule.setPoints(ruleRequest.getPoints() == null ? 0 : ruleRequest.getPoints());
            rule.setRuleKey(resolveRuleKey(ruleRequest.getFieldName()));
            rule.setRuleValue(ruleRequest.getExpectedValue());
            rule.setTolerance(0.0);
            rule.setPartialPercentage(ruleRequest.getPartialPercentage() == null ? 0.0 : ruleRequest.getPartialPercentage());
            rules.add(rule);
        }
        return rules;
    }

    private List<SchemeRequiredDocument> buildDocuments(List<SchemeRequiredDocumentRequestDTO> requests, Schemes scheme) {
        List<SchemeRequiredDocument> documents = new ArrayList<>();
        if (requests == null) {
            return documents;
        }

        for (SchemeRequiredDocumentRequestDTO documentRequest : requests) {
            if (documentRequest == null || documentRequest.getDocumentType() == null) {
                continue;
            }

            SchemeRequiredDocument document = new SchemeRequiredDocument();
            document.setScheme(scheme);
            document.setDocumentType(documentRequest.getDocumentType());
            document.setMandatory(documentRequest.getMandatory() == null ? true : documentRequest.getMandatory());
            documents.add(document);
        }
        return documents;
    }

    private List<SchemeRequiredField> buildFields(List<SchemeRequiredFieldRequestDTO> requests, Schemes scheme) {
        List<SchemeRequiredField> fields = new ArrayList<>();
        if (requests == null) {
            return fields;
        }

        for (SchemeRequiredFieldRequestDTO fieldRequest : requests) {
            if (fieldRequest == null || fieldRequest.getFieldName() == null) {
                continue;
            }

            SchemeRequiredField field = new SchemeRequiredField();
            field.setScheme(scheme);
            field.setFieldName(fieldRequest.getFieldName());
            field.setMandatory(fieldRequest.getMandatory() == null ? true : fieldRequest.getMandatory());
            fields.add(field);
        }
        return fields;
    }

    private SchemeResponseDTO toResponseDto(Schemes scheme) {
        SchemeResponseDTO dto = new SchemeResponseDTO();
        dto.setId(scheme.getId());
        dto.setSchemeCode(scheme.getSchemeCode());
        dto.setSchemeName(scheme.getSchemeName());
        dto.setDescription(scheme.getDescription());
        dto.setBenefit(scheme.getBenefit());
        dto.setAllocatedFunds(scheme.getAllocatedFunds());
        double allocatedForDto = scheme.getAllocatedFunds() != null ? scheme.getAllocatedFunds() : 0.0;
        double usedForDto = scheme.getBudgetUsed() != null ? scheme.getBudgetUsed() : 0.0;
        dto.setBudgetUsed(usedForDto);
        dto.setRemainingFunds(allocatedForDto - usedForDto);
        dto.setMinimumEligibleScore(scheme.getMinimumEligibleScore());
        dto.setActive(scheme.getActive());
        dto.setCategoryName(scheme.getCategory() != null ? scheme.getCategory().getCategoryName() : null);
        dto.setCategoryDescription(scheme.getCategory() != null ? scheme.getCategory().getDescription() : null);
        dto.setRules(scheme.getEligibilityRules() == null ? List.of() : scheme.getEligibilityRules().stream().map(rule -> {
            SchemeEligibilityRuleResponseDTO ruleDto = new SchemeEligibilityRuleResponseDTO();
            ruleDto.setId(rule.getId());
            ruleDto.setSchemeId(scheme.getId() == null ? null : scheme.getId().intValue());
            ruleDto.setFieldName(rule.getFieldName());
            ruleDto.setOperator(rule.getOperator());
            ruleDto.setExpectedValue(rule.getExpectedValue());
            ruleDto.setPoints(rule.getPoints());
            ruleDto.setPartialPercentage(rule.getPartialPercentage());
            return ruleDto;
        }).collect(Collectors.toList()));
        dto.setDocuments(scheme.getRequiredDocuments() == null ? List.of() : scheme.getRequiredDocuments().stream().map(document -> {
            SchemeRequiredDocumentResponseDTO documentDto = new SchemeRequiredDocumentResponseDTO();
            documentDto.setId(document.getId());
            documentDto.setSchemeId(scheme.getId() == null ? null : scheme.getId().intValue());
            documentDto.setDocumentType(document.getDocumentType());
            documentDto.setMandatory(document.getMandatory());
            return documentDto;
        }).collect(Collectors.toList()));
        dto.setFields(scheme.getRequiredFields() == null ? List.of() : scheme.getRequiredFields().stream().map(field -> {
            SchemeRequiredFieldResponseDTO fieldDto = new SchemeRequiredFieldResponseDTO();
            fieldDto.setId(field.getId());
            fieldDto.setSchemeId(scheme.getId() == null ? null : scheme.getId().intValue());
            fieldDto.setFieldName(field.getFieldName());
            fieldDto.setMandatory(field.getMandatory());
            return fieldDto;
        }).collect(Collectors.toList()));
        return dto;
    }
}
