package com.example.disbursement.repository;

import com.example.disbursement.model.DisbursementPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisbursementPlanRepository extends JpaRepository<DisbursementPlan, Long> {
}
