package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.WorkflowHistory;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WorkflowHistoryRepository extends JpaRepository<WorkflowHistory, Long> {

    List<WorkflowHistory> findByWorkflowIdOrderByCreatedAtAsc(Long workflowId);

    List<WorkflowHistory> findByNewStatus(ApplicationStatus newStatus);

    @Query(value = """
        SELECT FUNCTION('DATE', wh.createdAt), wh.newStatus, COUNT(wh)
        FROM WorkflowHistory wh
        WHERE wh.newStatus IN (
            com.example.gov_scheme_backend.enums.ApplicationStatus.APPROVED,
            com.example.gov_scheme_backend.enums.ApplicationStatus.REJECTED
        )
        AND wh.createdAt >= :since
        GROUP BY FUNCTION('DATE', wh.createdAt), wh.newStatus
        ORDER BY 1
    """)
    List<Object[]> countApprovedRejectedSince(@Param("since") LocalDateTime since);

    @Query(value = """
        SELECT COALESCE(wh.remarks, 'No reason specified'), COUNT(wh)
        FROM WorkflowHistory wh
        WHERE wh.newStatus = com.example.gov_scheme_backend.enums.ApplicationStatus.REJECTED
        GROUP BY COALESCE(wh.remarks, 'No reason specified')
        ORDER BY COUNT(wh) DESC
    """)
    List<Object[]> countRejectionsByReason();
}