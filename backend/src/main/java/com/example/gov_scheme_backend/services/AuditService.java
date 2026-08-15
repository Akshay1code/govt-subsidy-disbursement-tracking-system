package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.entities.AuditLog;

import java.util.List;

public interface AuditService {

    List<AuditLog> getAllLogs();

    List<AuditLog> getLogsByCurrentUser();

}