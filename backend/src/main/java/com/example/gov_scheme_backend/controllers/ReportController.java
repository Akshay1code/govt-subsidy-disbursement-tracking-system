package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.disbursement.OverdueMilestoneResponse;
import com.example.gov_scheme_backend.services.DisbursementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private DisbursementService disbursementService;

    @GetMapping("/overdue")
    public ResponseEntity<List<OverdueMilestoneResponse>> getOverdueMilestonesReport() {
        return ResponseEntity.ok(disbursementService.getOverdueMilestonesReport());
    }
}
