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

            String userValue = userFields.get(rule.getFieldName());
            if (userValue == null) {
                throw new BadRequestException(
                        "Missing value for field: " + rule.getFieldName()
                );
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

                    double user = Double.parseDouble(userValue);
                    double expected = Double.parseDouble(rule.getRuleValue());

                    if (user > expected) {
                        score += rule.getPoints();
                    }
                    else if ((expected - user) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
                    }

                    break;
                }

                case GREATER_THAN_EQUAL: {

                    double user = Double.parseDouble(userValue);
                    double expected = Double.parseDouble(rule.getRuleValue());

                    if (user >= expected) {
                        score += rule.getPoints();
                    }
                    else if ((expected - user) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
                    }

                    break;
                }

                case LESS_THAN: {

                    double user = Double.parseDouble(userValue);
                    double expected = Double.parseDouble(rule.getRuleValue());

                    if (user < expected) {
                        score += rule.getPoints();
                    }
                    else if ((user - expected) <= rule.getTolerance()) {
                        score += rule.getPoints() * rule.getPartialPercentage();
                    }

                    break;
                }

                case LESS_THAN_EQUAL: {

                    double user = Double.parseDouble(userValue);
                    double expected = Double.parseDouble(rule.getRuleValue());

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
