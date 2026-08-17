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

    public double validateFields(Long applicationId){

        Application application = applicationRepo.findById(applicationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Application not found"));

        List<SchemeEligibilityRule> rules = application.getScheme().getEligibilityRules();
        double score = 0;
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

            switch (rule.getOperator()) {

                case EQUALS:
                    if (userValue.equalsIgnoreCase(rule.getRuleValue())) {
                        score += rule.getPoints();
                    }
                    break;

                case NOT_EQUALS:
                    if (!userValue.equalsIgnoreCase(rule.getRuleValue())) {
                        score += rule.getPoints();
                    }
                    break;

                case GREATER_THAN: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        continue;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        continue;
                    }

                    if (user > expected) {
                        score += rule.getPoints();
                    }
                    else if ((expected - user) <= safeTolerance(rule)) {
                        score += rule.getPoints() * safePartialMultiplier(rule);
                    }

                    break;
                }

                case GREATER_THAN_EQUAL: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        continue;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        continue;
                    }

                    if (user >= expected) {
                        score += rule.getPoints();
                    }
                    else if ((expected - user) <= safeTolerance(rule)) {
                        score += rule.getPoints() * safePartialMultiplier(rule);
                    }

                    break;
                }

                case LESS_THAN: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        continue;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        continue;
                    }

                    if (user < expected) {
                        score += rule.getPoints();
                    }
                    else if ((user - expected) <= safeTolerance(rule)) {
                        score += rule.getPoints() * safePartialMultiplier(rule);
                    }

                    break;
                }

                case LESS_THAN_EQUAL: {
                    if (!isNumericRuleField(rule.getFieldName())) {
                        continue;
                    }
                    Double user = parseDoubleSafely(userValue);
                    Double expected = parseDoubleSafely(rule.getRuleValue());
                    if (user == null || expected == null) {
                        continue;
                    }

                    if (user <= expected) {
                        score += rule.getPoints();
                    }
                    else if ((user - expected) <= safeTolerance(rule)) {
                        score += rule.getPoints() * safePartialMultiplier(rule);
                    }

                    break;
                }
            }
        }
        return score;
    }
}
