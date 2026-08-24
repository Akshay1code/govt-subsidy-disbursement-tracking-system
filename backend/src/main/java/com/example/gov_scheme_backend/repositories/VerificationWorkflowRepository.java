package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface VerificationWorkflowRepository extends JpaRepository<VerificationWorkflow, Long> {

    Optional<VerificationWorkflow> findByApplicationId(Long applicationId);

    List<VerificationWorkflow> findByApplicationIdIn(java.util.Collection<Long> applicationIds);

    List<VerificationWorkflow> findByCurrentStage(WorkflowStage currentStage);

    List<VerificationWorkflow> findByAssignedOfficer(Users assignedOfficer);

    @Query("""
        SELECT u.fullName, COUNT(vw)
        FROM VerificationWorkflow vw
        JOIN vw.assignedOfficer u
        WHERE vw.currentStage <> com.example.gov_scheme_backend.enums.WorkflowStage.COMPLETED
        GROUP BY u.fullName
        ORDER BY COUNT(vw) DESC
    """)
    List<Object[]> countPendingByOfficer();

    @Query("SELECT COUNT(v) FROM VerificationWorkflow v WHERE v.assignedOfficer.id = :officerId AND v.currentStage <> com.example.gov_scheme_backend.enums.WorkflowStage.COMPLETED")
    long countActiveAssignmentsByOfficer(Long officerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM VerificationWorkflow v WHERE v.assignedOfficer IS NULL AND v.currentStage = :stage ORDER BY v.application.createdAt ASC, v.application.id ASC")
    Page<VerificationWorkflow> findOldestUnassignedWorkflowsByStageWithLock(WorkflowStage stage, Pageable pageable);

    long countByCurrentStageAndAssignedOfficerIsNull(WorkflowStage stage);

    long countByAssignedOfficer(Users officer);

    List<VerificationWorkflow> findByCurrentStageAndAssignedOfficerIsNullOrderByApplication_CreatedAtAsc(
            WorkflowStage stage,
            Pageable pageable
    );
}