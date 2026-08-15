package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.AuditAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByAction(AuditAction action);

    List<AuditLog> findAllByOrderByCreatedAtDesc();

    List<AuditLog> findByUserOrderByCreatedAtDesc(Users user);
}