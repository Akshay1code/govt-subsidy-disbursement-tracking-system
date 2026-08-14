package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.dashboard.PerformanceDashboardResponse;
import com.example.gov_scheme_backend.dto.response.dashboard.SchemeDashboardResponse;
import com.example.gov_scheme_backend.dto.response.dashboard.RegionDashboardResponse;
import java.util.List;

public interface DashboardService {

    List<SchemeDashboardResponse> getSchemeDashboard();
    List<RegionDashboardResponse> getRegionDashboard();
    PerformanceDashboardResponse getPerformanceDashboard();
}