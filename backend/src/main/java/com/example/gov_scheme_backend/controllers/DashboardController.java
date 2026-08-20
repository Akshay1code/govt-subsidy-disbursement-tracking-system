package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.dashboard.*;
import com.example.gov_scheme_backend.services.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryFundResponse>> getCategoryFundBreakdown() {
        return ResponseEntity.ok(dashboardService.getCategoryFundBreakdown());
    }

    @GetMapping("/trends")
    public ResponseEntity<List<MonthlyTrendResponse>> getMonthlyTrends() {
        return ResponseEntity.ok(dashboardService.getMonthlyTrends());
    }

    @GetMapping("/sparkline")
    public ResponseEntity<List<SparklineResponse>> getSparkline() {
        return ResponseEntity.ok(dashboardService.getSparkline());
    }

    @GetMapping("/officer-queue")
    public ResponseEntity<List<OfficerQueueResponse>> getOfficerQueue() {
        return ResponseEntity.ok(dashboardService.getOfficerQueue());
    }

    @GetMapping("/flag-reasons")
    public ResponseEntity<List<FlagReasonResponse>> getFlagReasons() {
        return ResponseEntity.ok(dashboardService.getFlagReasons());
    }

    @GetMapping("/rejection-reasons")
    public ResponseEntity<List<RejectionReasonResponse>> getRejectionReasons() {
        return ResponseEntity.ok(dashboardService.getRejectionReasons());
    }
}