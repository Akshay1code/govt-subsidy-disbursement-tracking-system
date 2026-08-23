package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.response.dashboard.*;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.DisbursementMilestone;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.entities.WorkflowHistory;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.MilestoneStatus;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.DisbursementMilestoneRepo;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository;
import com.example.gov_scheme_backend.repositories.WorkflowHistoryRepository;
import com.example.gov_scheme_backend.services.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired private SchemeRepo schemeRepo;
    @Autowired private ApplicationRepo applicationRepo;
    @Autowired private DisbursementMilestoneRepo milestoneRepo;
    @Autowired private WorkflowHistoryRepository workflowHistoryRepo;
    @Autowired private VerificationWorkflowRepository verificationWorkflowRepo;

    @Override
    public List<SchemeDashboardResponse> getSchemeDashboard() {

        List<Schemes> schemes = schemeRepo.findAll();

        Map<String, Long> appsByScheme = applicationRepo.countApplicationsByScheme()
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));

        return schemes.stream()
                .map(scheme -> {

                    double allocated = scheme.getAllocatedFunds() != null ? scheme.getAllocatedFunds().doubleValue() : 0.0;
                    double used = scheme.getBudgetUsed() != null ? scheme.getBudgetUsed().doubleValue() : 0.0;
                    double remaining = allocated - used;
                    double utilization = allocated > 0 ? (used / allocated) * 100 : 0.0;

                    return SchemeDashboardResponse.builder()
                            .schemeCode(scheme.getSchemeCode())
                            .schemeName(scheme.getSchemeName())
                            .allocatedFunds(allocated)
                            .budgetUsed(used)
                            .remainingFunds(remaining)
                            .utilizationPercentage(utilization)
                            .totalApplications(appsByScheme.getOrDefault(scheme.getSchemeCode(), 0L))
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
        if (result.length == 1 && result[0] instanceof Object[]) {
            result = (Object[]) result[0];
        }

        Long disbursed = applicationRepo.countByStatus(ApplicationStatus.DISBURSED);
        Long awaitingDisbursement = applicationRepo.countByStatus(ApplicationStatus.APPROVED);
        Long flaggedMilestones = milestoneRepo.countByCompletionStatus(MilestoneStatus.OVERDUE);

        Long totalApplications = toLong(result[0]);
        Long missingDocs = applicationRepo.countByDocumentsIsEmpty();
        double missingDocsPct = totalApplications > 0
                ? (missingDocs * 100.0) / totalApplications
                : 0.0;

        double avgApprovalDays = computeAvgApprovalDays();
        double avgDisbursementDays = computeAvgDisbursementDays();

        return PerformanceDashboardResponse.builder()
                .totalApplications(totalApplications)
                .approvedApplications(toLong(result[1]))
                .rejectedApplications(toLong(result[2]))
                .underReviewApplications(toLong(result[3]))
                .disbursedApplications(disbursed)
                .awaitingDisbursementApplications(awaitingDisbursement)
                .flaggedMilestones(flaggedMilestones)
                .avgApprovalDays(round2(avgApprovalDays))
                .avgDisbursementDays(round2(avgDisbursementDays))
                .missingDocsPct(round2(missingDocsPct))
                .build();
    }

    @Override
    public List<CategoryFundResponse> getCategoryFundBreakdown() {
        return schemeRepo.sumFundsByCategory()
                .stream()
                .map(row -> {
                    String category = (String) row[0];
                    double sanctioned = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                    double disbursed = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
                    return CategoryFundResponse.builder()
                            .category(category)
                            .sanctioned(sanctioned)
                            .disbursed(disbursed)
                            .remaining(sanctioned - disbursed)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<MonthlyTrendResponse> getMonthlyTrends() {

        Map<String, Long> appsByMonth = applicationRepo.countApplicationsByMonth()
                .stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        Map<String, Long> disbByMonth = milestoneRepo.countReleasedMilestonesByMonth()
                .stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        java.util.TreeSet<String> months = new java.util.TreeSet<>();
        months.addAll(appsByMonth.keySet());
        months.addAll(disbByMonth.keySet());

        return months.stream()
                .map(m -> MonthlyTrendResponse.builder()
                        .month(m)
                        .applications(appsByMonth.getOrDefault(m, 0L))
                        .disbursements(disbByMonth.getOrDefault(m, 0L))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<SparklineResponse> getSparkline() {

        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> rows = workflowHistoryRepo.countApprovedRejectedSince(since);

        Map<String, long[]> byDate = new java.util.TreeMap<>();
        for (Object[] row : rows) {
            String date = row[0].toString();
            ApplicationStatus status = (ApplicationStatus) row[1];
            long count = (Long) row[2];
            byDate.putIfAbsent(date, new long[2]); // [approved, rejected]
            if (status == ApplicationStatus.APPROVED) byDate.get(date)[0] += count;
            if (status == ApplicationStatus.REJECTED) byDate.get(date)[1] += count;
        }

        return byDate.entrySet().stream()
                .map(e -> SparklineResponse.builder()
                        .date(e.getKey())
                        .approved(e.getValue()[0])
                        .rejected(e.getValue()[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<OfficerQueueResponse> getOfficerQueue() {
        return verificationWorkflowRepo.countPendingByOfficer()
                .stream()
                .map(row -> OfficerQueueResponse.builder()
                        .officerName((String) row[0])
                        .pendingCount((Long) row[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<FlagReasonResponse> getFlagReasons() {
        return milestoneRepo.countOverdueByReason()
                .stream()
                .map(row -> FlagReasonResponse.builder()
                        .reason((String) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<RejectionReasonResponse> getRejectionReasons() {

        List<Object[]> rows = workflowHistoryRepo.countRejectionsByReason();
        long total = rows.stream().mapToLong(r -> (Long) r[1]).sum();

        return rows.stream()
                .map(row -> {
                    long count = (Long) row[1];
                    double pct = total > 0 ? (count * 100.0) / total : 0.0;
                    return RejectionReasonResponse.builder()
                            .reason((String) row[0])
                            .count(count)
                            .percentage(round2(pct))
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ---- helpers ----

    private double computeAvgApprovalDays() {
        List<WorkflowHistory> approvals = workflowHistoryRepo.findByNewStatus(ApplicationStatus.APPROVED);
        if (approvals.isEmpty()) return 0.0;

        double totalDays = 0;
        int counted = 0;
        for (WorkflowHistory wh : approvals) {
            try {
                LocalDateTime appCreated = wh.getWorkflow().getApplication().getCreatedAt();
                if (appCreated == null || wh.getCreatedAt() == null) continue;
                totalDays += ChronoUnit.DAYS.between(appCreated, wh.getCreatedAt());
                counted++;
            } catch (Exception ignored) { /* skip incomplete records */ }
        }
        return counted > 0 ? totalDays / counted : 0.0;
    }

    private double computeAvgDisbursementDays() {
        List<DisbursementMilestone> released = milestoneRepo.findByCompletionStatus(MilestoneStatus.RELEASED);
        if (released.isEmpty()) return 0.0;

        List<Long> appIds = released.stream()
                .map(m -> m.getPlan().getApplicationId())
                .distinct()
                .collect(Collectors.toList());

        Map<Long, LocalDateTime> createdAtById = applicationRepo.findAllById(appIds)
                .stream()
                .collect(Collectors.toMap(Application::getId, Application::getCreatedAt));

        double totalDays = 0;
        int counted = 0;
        for (DisbursementMilestone m : released) {
            if (m.getReleaseDate() == null) continue;
            LocalDateTime appCreated = createdAtById.get(m.getPlan().getApplicationId());
            if (appCreated == null) continue;
            totalDays += ChronoUnit.DAYS.between(appCreated.toLocalDate(), m.getReleaseDate());
            counted++;
        }
        return counted > 0 ? totalDays / counted : 0.0;
    }

    private Long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}