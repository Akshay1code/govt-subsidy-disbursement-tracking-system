package com.example.gov_scheme_backend.disbursement.repository;

import com.example.gov_scheme_backend.disbursement.model.DisbursementMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DisbursementMilestoneRepository extends JpaRepository<DisbursementMilestone, Long> {
    List<DisbursementMilestone> findByPlanIdOrderByStageNumber(Long planId);
    Optional<DisbursementMilestone> findByPlanIdAndStageNumber(Long planId, Integer stageNumber);
}
