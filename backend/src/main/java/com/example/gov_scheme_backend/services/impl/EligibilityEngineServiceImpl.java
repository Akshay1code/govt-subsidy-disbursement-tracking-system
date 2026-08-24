package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.entities.*;
import com.example.gov_scheme_backend.enums.RuleField;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.SchemeEligibilityRuleRepo;
import com.example.gov_scheme_backend.services.EligibilityEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EligibilityEngineServiceImpl implements EligibilityEngineService {
    @Autowired
    ApplicationRepo applicationRepo;
    @Autowired
    SchemeEligibilityRuleRepo schemeEligibilityRuleRepo;

    private static boolean isNumericRuleField(RuleField field) {
        return field == RuleField.AGE
                || field == RuleField.ANNUAL_INCOME
                || field == RuleField.LAND_AREA;
    }

    private static double safeTolerance(SchemeEligibilityRule rule) {
        return rule.getTolerance() == null ? 0.0 : rule.getTolerance();
    }

    private static double safePartialMultiplier(SchemeEligibilityRule rule) {
        double percentage = rule.getPartialPercentage() == null ? 0.0 : rule.getPartialPercentage();
        if (percentage <= 0) {
            return 0.0;
        }
        return percentage > 1 ? percentage / 100.0 : percentage;
    }

    private static Double parseDoubleSafely(String value) {
        if (value == null) {
            return null;
        }
        try {

            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO validateFields(Long applicationId){

        Application application = applicationRepo.findById(applicationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Application not found"));

        List<SchemeEligibilityRule> rules = application.getScheme().getEligibilityRules();
        double totalScore = 0;
        double totalPossibleScore = 0;
        java.util.List<com.example.gov_scheme_backend.dto.response.application.EligibilityFieldResultDTO> fieldBreakdown = new java.util.ArrayList<>();
        Map<RuleField, String> userFields = new HashMap<>();
        for (ApplicationFieldValue field : application.getFieldValues()) {

            userFields.put(
                    field.getFieldName(),
                    field.getFieldValue()
            );
        }
        for (SchemeEligibilityRule rule : rules) {
            if (rule == null || rule.getFieldName() == null) {
                continue;
            }

            String userValue = userFields.get(rule.getFieldName());
            if (userValue == null) {
                continue;
            }

            double pointsAwarded = 0;
            // Use 10.0 as a default when admin left points unset (0).
            // This ensures the score is always meaningful and comparable
            // against the scheme's minimumEligibleScore threshold.
            double effectivePoints = rule.getPoints() > 0 ? rule.getPoints() : 10.0;
            double pointsPossible = effectivePoints;
            boolean partialCredit = false;
            boolean ruleMet = false;

            switch (rule.getOperator()) {

                case EQUALS:
                    if (userValue.equalsIgnoreCase(rule.getRuleValue())) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    break;

                case NOT_EQUALS:
                    if (!userValue.equalsIgnoreCase(rule.getRuleValue())) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    break;

                case GREATER_THAN: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        break;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        break;
                    }

                    if (user > expected) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    else if ((expected - user) <= safeTolerance(rule)) {
                        pointsAwarded = effectivePoints * safePartialMultiplier(rule);
                        if (pointsAwarded > 0) partialCredit = true;
                    }

                    break;
                }

                case GREATER_THAN_EQUAL: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        break;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        break;
                    }

                    if (user >= expected) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    else if ((expected - user) <= safeTolerance(rule)) {
                        pointsAwarded = effectivePoints * safePartialMultiplier(rule);
                        if (pointsAwarded > 0) partialCredit = true;
                    }

                    break;
                }

                case LESS_THAN: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        break;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        break;
                    }

                    if (user < expected) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    else if ((user - expected) <= safeTolerance(rule)) {
                        pointsAwarded = effectivePoints * safePartialMultiplier(rule);
                        if (pointsAwarded > 0) partialCredit = true;
                    }

                    break;
                }

                case LESS_THAN_EQUAL: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        break;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        break;
                    }

                    if (user <= expected) {
                        pointsAwarded = effectivePoints;
                        ruleMet = true;
                    }
                    else if ((user - expected) <= safeTolerance(rule)) {
                        pointsAwarded = effectivePoints * safePartialMultiplier(rule);
                        if (pointsAwarded > 0) partialCredit = true;
                    }

                    break;
                }
            }

            totalScore += pointsAwarded;
            totalPossibleScore += pointsPossible;

            com.example.gov_scheme_backend.dto.response.application.EligibilityFieldResultDTO fieldResult =
                    new com.example.gov_scheme_backend.dto.response.application.EligibilityFieldResultDTO();
            fieldResult.setFieldName(rule.getFieldName().name());
            fieldResult.setOperator(rule.getOperator().name());
            fieldResult.setExpectedValue(rule.getRuleValue());
            fieldResult.setUserValue(userValue);
            fieldResult.setPointsAwarded(pointsAwarded);
            fieldResult.setPointsPossible(pointsPossible);
            fieldResult.setPartialCredit(partialCredit);
            fieldResult.setRuleMet(ruleMet);
            fieldResult.setRequirementDescription(
                    buildRequirementDescription(rule.getFieldName().name(), rule.getOperator().name(), rule.getRuleValue()));
            fieldResult.setScoreDescription(
                    buildScoreDescription(pointsAwarded, pointsPossible, ruleMet, partialCredit));
            fieldBreakdown.add(fieldResult);
        }

        com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO result = new com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO();
        result.setScore(totalScore);
        result.setTotalPossibleScore(totalPossibleScore);
        result.setFieldBreakdown(fieldBreakdown);
        // Status and message will be set by the caller (ApplicationServiceImpl)
        
        return result;
    }

    // -------------------------------------------------------------------------
    // Human-readable description helpers
    // -------------------------------------------------------------------------

    private static String buildRequirementDescription(String fieldName, String operator, String ruleValue) {
        String humanField = humanizeField(fieldName);
        String humanOp;
        switch (operator) {
            case "EQUALS":              humanOp = "must be equal to";          break;
            case "NOT_EQUALS":          humanOp = "must not be equal to";       break;
            case "GREATER_THAN":        humanOp = "must be greater than";       break;
            case "GREATER_THAN_EQUAL":  humanOp = "must be at least";           break;
            case "LESS_THAN":           humanOp = "must be less than";          break;
            case "LESS_THAN_EQUAL":     humanOp = "must be at most";            break;
            default:                    humanOp = operator.toLowerCase().replace('_', ' ');
        }
        return humanField + " " + humanOp + " " + humanizeValue(fieldName, ruleValue);
    }

    private static String buildScoreDescription(double awarded, double possible, boolean ruleMet, boolean partialCredit) {
        if (possible <= 0) {
            return ruleMet ? "Requirement met" : "Requirement not met";
        }
        String pts = formatPts(awarded) + " / " + formatPts(possible) + " pts earned";
        if (ruleMet) {
            return pts + " – Fully met";
        } else if (partialCredit) {
            return pts + " – Partially met";
        } else {
            return pts + " – Not met";
        }
    }

    private static String humanizeField(String fieldName) {
        if (fieldName == null) return "";
        switch (fieldName) {
            case "AGE":           return "Age";
            case "ANNUAL_INCOME": return "Annual Income";
            case "LAND_AREA":     return "Land Area";
            case "OCCUPATION":    return "Occupation";
            case "CASTE":         return "Caste";
            case "STATE":         return "State";
            case "GENDER":        return "Gender";
            default:              return fieldName.replace('_', ' ').toLowerCase();
        }
    }

    private static String humanizeValue(String fieldName, String value) {
        if (value == null) return "";
        // For numeric income fields, format with commas
        if ("ANNUAL_INCOME".equals(fieldName)) {
            try {
                double d = Double.parseDouble(value.trim());
                return String.format("%,.0f", d);
            } catch (NumberFormatException ignored) {}
        }
        return value;
    }

    private static String formatPts(double pts) {
        if (pts == Math.floor(pts)) {
            return String.valueOf((long) pts);
        }
        return String.format("%.1f", pts);
    }
}
