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
                || field == RuleField.INCOME
                || field == RuleField.CGPA;
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

            boolean matched = false;

            switch (rule.getOperator()) {

                case EQUALS:
                    matched = userValue.equalsIgnoreCase(rule.getRuleValue());
                    break;

                case NOT_EQUALS:
                    matched = !userValue.equalsIgnoreCase(rule.getRuleValue());
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
                    else if ((expected - user) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
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
                    else if ((expected - user) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
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
                    else if ((user - expected) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
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
                    else if ((user - expected) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
                    }

                    break;
                }
            }
            if (matched) {
                score += rule.getPoints();
            }
        }
        return score;
    }
}
