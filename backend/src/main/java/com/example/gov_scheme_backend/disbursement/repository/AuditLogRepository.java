package com.example.gov_scheme_backend.disbursement.repository;

import com.example.gov_scheme_backend.disbursement.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
