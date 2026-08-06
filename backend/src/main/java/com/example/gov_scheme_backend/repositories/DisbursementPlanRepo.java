package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.DisbursementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisbursementPlanRepo extends JpaRepository<DisbursementPlan, Long> {
    Optional<DisbursementPlan> findByApplicationId(Long applicationId);
}
