package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.services.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepo auditLogRepo;

    @Override
    public List<AuditLog> getAllLogs() {
        return auditLogRepo.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public List<AuditLog> getLogsByCurrentUser() {

        Users user = (Users) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return auditLogRepo.findByUserOrderByCreatedAtDesc(user);
    }
}