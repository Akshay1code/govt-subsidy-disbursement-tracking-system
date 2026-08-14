package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.WorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkflowHistoryRepository extends JpaRepository<WorkflowHistory, Long> {

    List<WorkflowHistory> findByWorkflowIdOrderByCreatedAtAsc(Long workflowId);

}