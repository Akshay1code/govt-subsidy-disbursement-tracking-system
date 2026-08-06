package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.DisbursementMilestone;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisbursementMilestoneRepo extends JpaRepository<DisbursementMilestone, Long> {
    List<DisbursementMilestone> findByPlanOrderByStageNumberAsc(DisbursementPlan plan);
    Optional<DisbursementMilestone> findByPlanAndStageNumber(DisbursementPlan plan, Integer stageNumber);
}
