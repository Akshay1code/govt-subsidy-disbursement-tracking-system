package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {

    java.util.List<AuditLog> findByAction(com.example.gov_scheme_backend.enums.AuditAction action);
}