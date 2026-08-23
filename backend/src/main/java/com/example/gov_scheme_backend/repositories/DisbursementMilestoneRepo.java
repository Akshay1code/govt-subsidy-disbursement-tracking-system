package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.DisbursementMilestone;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.enums.MilestoneStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisbursementMilestoneRepo
        extends JpaRepository<DisbursementMilestone, Long> {

    List<DisbursementMilestone> findByPlanOrderByStageNumberAsc(
            DisbursementPlan plan
    );

    Optional<DisbursementMilestone> findByPlanAndStageNumber(
            DisbursementPlan plan,
            Integer stageNumber
    );

    List<DisbursementMilestone> findByCompletionStatus(
            MilestoneStatus completionStatus
    );

    List<DisbursementMilestone> findByCompletionStatusAndDueDateBetween(
            MilestoneStatus status, 
            java.time.LocalDate startDate, 
            java.time.LocalDate endDate
    );

    List<DisbursementMilestone> findByCompletionStatusAndDueDateBefore(
            MilestoneStatus status, 
            java.time.LocalDate date
    );

    List<DisbursementMilestone> findByPlan_PlanId(
            Long planId
    );

    Long countByCompletionStatus(com.example.gov_scheme_backend.enums.MilestoneStatus status);

    @Query(value = """
        SELECT COALESCE(m.resolvedReason, 'Unspecified'), COUNT(m)
        FROM DisbursementMilestone m
        WHERE m.completionStatus = com.example.gov_scheme_backend.enums.MilestoneStatus.OVERDUE
        GROUP BY COALESCE(m.resolvedReason, 'Unspecified')
        ORDER BY COUNT(m) DESC
    """)
    List<Object[]> countOverdueByReason();

    @Query(value = """
        SELECT FUNCTION('DATE_FORMAT', m.releaseDate, '%Y-%m'), COUNT(m)
        FROM DisbursementMilestone m
        WHERE m.completionStatus = com.example.gov_scheme_backend.enums.MilestoneStatus.RELEASED
          AND m.releaseDate IS NOT NULL
        GROUP BY FUNCTION('DATE_FORMAT', m.releaseDate, '%Y-%m')
        ORDER BY 1
    """)
    List<Object[]> countReleasedMilestonesByMonth();
}