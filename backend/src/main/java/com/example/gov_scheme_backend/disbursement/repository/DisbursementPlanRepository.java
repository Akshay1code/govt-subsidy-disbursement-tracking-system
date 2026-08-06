package com.example.gov_scheme_backend.disbursement.repository;

import com.example.gov_scheme_backend.disbursement.model.DisbursementPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisbursementPlanRepository extends JpaRepository<DisbursementPlan, Long> {
}
