package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.entities.AuditLog;
import com.example.gov_scheme_backend.services.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/gov/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLog> getAllLogs() {

        return auditService.getAllLogs();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public List<AuditLog> getMyLogs() {

        return auditService.getLogsByCurrentUser();
    }
}