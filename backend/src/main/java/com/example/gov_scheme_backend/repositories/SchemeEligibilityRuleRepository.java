package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.SchemeEligibilityRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchemeEligibilityRuleRepository
        extends JpaRepository<SchemeEligibilityRule, Long> {

    List<SchemeEligibilityRule> findBySchemeId(Integer schemeId);

}