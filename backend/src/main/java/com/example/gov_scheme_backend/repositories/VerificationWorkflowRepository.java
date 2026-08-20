package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VerificationWorkflowRepository extends JpaRepository<VerificationWorkflow, Long> {

    Optional<VerificationWorkflow> findByApplicationId(Long applicationId);

    List<VerificationWorkflow> findByCurrentStage(WorkflowStage currentStage);

    List<VerificationWorkflow> findByAssignedOfficer(Users assignedOfficer);

    @org.springframework.data.jpa.repository.Query("""
        SELECT u.fullName, COUNT(vw)
        FROM VerificationWorkflow vw
        JOIN vw.assignedOfficer u
        WHERE vw.currentStage <> com.example.gov_scheme_backend.enums.WorkflowStage.COMPLETED
        GROUP BY u.fullName
        ORDER BY COUNT(vw) DESC
    """)
    List<Object[]> countPendingByOfficer();
}