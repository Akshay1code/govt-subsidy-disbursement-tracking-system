package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.dashboard.SchemeDashboardResponse;
import com.example.gov_scheme_backend.services.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.gov_scheme_backend.dto.response.dashboard.RegionDashboardResponse;
import com.example.gov_scheme_backend.dto.response.dashboard.PerformanceDashboardResponse;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/schemes")
    public ResponseEntity<List<SchemeDashboardResponse>> getSchemeDashboard() {
        return ResponseEntity.ok(dashboardService.getSchemeDashboard());
    }

    @GetMapping("/regions")
    public ResponseEntity<List<RegionDashboardResponse>> getRegionDashboard() {
        return ResponseEntity.ok(dashboardService.getRegionDashboard());
    }

    @GetMapping("/performance")
    public ResponseEntity<PerformanceDashboardResponse> getPerformanceDashboard() {
        return ResponseEntity.ok(dashboardService.getPerformanceDashboard());
    }
}