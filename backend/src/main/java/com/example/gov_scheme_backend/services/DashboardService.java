package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.dashboard.*;
import java.util.List;

public interface DashboardService {

    List<SchemeDashboardResponse> getSchemeDashboard();
    List<RegionDashboardResponse> getRegionDashboard();
    PerformanceDashboardResponse getPerformanceDashboard();

    List<CategoryFundResponse> getCategoryFundBreakdown();
    List<MonthlyTrendResponse> getMonthlyTrends();
    List<SparklineResponse> getSparkline();
    List<OfficerQueueResponse> getOfficerQueue();
    List<FlagReasonResponse> getFlagReasons();
    List<RejectionReasonResponse> getRejectionReasons();
}