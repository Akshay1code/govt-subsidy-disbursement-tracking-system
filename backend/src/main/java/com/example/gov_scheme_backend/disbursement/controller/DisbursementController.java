package com.example.gov_scheme_backend.disbursement.controller;

import com.example.gov_scheme_backend.disbursement.dto.ConfigurePlanRequest;
import com.example.gov_scheme_backend.disbursement.model.DisbursementMilestone;
import com.example.gov_scheme_backend.disbursement.service.DisbursementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/disbursement")
public class DisbursementController {

    private final DisbursementService service;

    public DisbursementController(DisbursementService service) {
        this.service = service;
    }

    @PostMapping("/plan/{planId}/configure")
    public ResponseEntity<?> configurePlan(@PathVariable Long planId, @RequestBody ConfigurePlanRequest req) {
        try {
            List<DisbursementMilestone> created = service.configurePlan(planId, req);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/release/{milestoneId}")
    public ResponseEntity<?> releaseMilestone(@PathVariable Long milestoneId) {
        try {
            service.releaseMilestone(milestoneId);
            return ResponseEntity.ok("Released");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
