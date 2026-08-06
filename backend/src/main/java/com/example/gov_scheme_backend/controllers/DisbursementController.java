package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.disbursement.StageConfigurationRequest;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementMilestoneResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementPlanResponse;
import com.example.gov_scheme_backend.services.DisbursementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/disbursement")
@CrossOrigin(origins = "*")
public class DisbursementController {

    @Autowired
    private DisbursementService disbursementService;

    @PostMapping("/plan/{planId}/configure")
    public ResponseEntity<DisbursementPlanResponse> configurePlan(
            @PathVariable Long planId,
            @RequestBody StageConfigurationRequest request) {
        return ResponseEntity.ok(disbursementService.configurePlan(planId, request));
    }

    @PostMapping("/milestone/{milestoneId}/complete")
    public ResponseEntity<DisbursementMilestoneResponse> completeMilestone(
            @PathVariable Long milestoneId) {
        return ResponseEntity.ok(disbursementService.completeMilestone(milestoneId));
    }

    @PostMapping("/release/{milestoneId}")
    public ResponseEntity<DisbursementMilestoneResponse> releaseMilestone(
            @PathVariable Long milestoneId) {
        return ResponseEntity.ok(disbursementService.releaseMilestone(milestoneId));
    }

    @GetMapping("/plan/application/{applicationId}")
    public ResponseEntity<DisbursementPlanResponse> getPlanByApplication(
            @PathVariable Long applicationId) {
        try {
            return ResponseEntity.ok(disbursementService.getPlanByApplication(applicationId));
        } catch (com.example.gov_scheme_backend.exceptions.ResourceNotFoundException e) {
            // In case it doesn't exist, we return a 404
            return ResponseEntity.notFound().build();
        }
    }

    @Autowired
    private com.example.gov_scheme_backend.repositories.SchemeRepo schemeRepo;

    @GetMapping("/schemes/{schemeCode}")
    public ResponseEntity<?> getSchemeByCode(@PathVariable String schemeCode) {
        return ResponseEntity.ok(schemeRepo.findBySchemeCode(schemeCode).orElse(null));
    }

    @Autowired
    private com.example.gov_scheme_backend.repositories.AuditLogRepo auditLogRepo;

    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepo.findAll());
    }

    @PutMapping("/milestone/{milestoneId}/resolve")
    public ResponseEntity<?> resolveMilestone(
            @PathVariable Long milestoneId,
            @RequestBody java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(disbursementService.resolveMilestone(milestoneId, reason));
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        if (username == null || "anonymousUser".equalsIgnoreCase(username)) {
            // Default to "farmer1" for easier testing if not logged in
            username = "farmer1";
        }
        try {
            return ResponseEntity.ok(disbursementService.getUserNotifications(username));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @PostMapping("/seed")
    public ResponseEntity<DisbursementPlanResponse> seedData() {
        return ResponseEntity.ok(disbursementService.seedData());
    }
}
