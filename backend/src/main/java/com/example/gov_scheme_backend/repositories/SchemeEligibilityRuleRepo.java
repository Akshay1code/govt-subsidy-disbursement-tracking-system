package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.SchemeEligibilityRule;
import com.example.gov_scheme_backend.entities.Schemes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchemeEligibilityRuleRepo extends JpaRepository<SchemeEligibilityRule,Long> {
    List<SchemeEligibilityRule> findByScheme(Schemes scheme);
}
