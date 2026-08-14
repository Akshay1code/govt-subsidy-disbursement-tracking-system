package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.response.dashboard.PerformanceDashboardResponse;
import com.example.gov_scheme_backend.dto.response.dashboard.RegionDashboardResponse;
import com.example.gov_scheme_backend.dto.response.dashboard.SchemeDashboardResponse;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.services.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired
    private SchemeRepo schemeRepo;

    @Autowired
    private ApplicationRepo applicationRepo;

    @Override
    public List<SchemeDashboardResponse> getSchemeDashboard() {

        List<Schemes> schemes = schemeRepo.findAll();

        return schemes.stream()
                .map(scheme -> {

                    double allocated = scheme.getAllocatedFunds() != null
                            ? scheme.getAllocatedFunds()
                            : 0.0;

                    double used = scheme.getBudgetUsed() != null
                            ? scheme.getBudgetUsed()
                            : 0.0;

                    double remaining = allocated - used;

                    double utilization = allocated > 0
                            ? (used / allocated) * 100
                            : 0.0;

                    return SchemeDashboardResponse.builder()
                            .schemeCode(scheme.getSchemeCode())
                            .schemeName(scheme.getSchemeName())
                            .allocatedFunds(allocated)
                            .budgetUsed(used)
                            .remainingFunds(remaining)
                            .utilizationPercentage(utilization)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<RegionDashboardResponse> getRegionDashboard() {

        return applicationRepo.countApplicationsByRegion()
                .stream()
                .map(row -> RegionDashboardResponse.builder()
                        .region((String) row[0])
                        .totalApplications((Long) row[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public PerformanceDashboardResponse getPerformanceDashboard() {

        Object[] result = applicationRepo.getApplicationPerformance();

        // Hibernate may return a nested Object[] for the aggregate query
        if (result.length == 1 && result[0] instanceof Object[]) {
            result = (Object[]) result[0];
        }

        return PerformanceDashboardResponse.builder()
                .totalApplications(toLong(result[0]))
                .approvedApplications(toLong(result[1]))
                .rejectedApplications(toLong(result[2]))
                .underReviewApplications(toLong(result[3]))
                .build();
    }

    private Long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }
}