package com.example.gov_scheme_backend.disbursement.service;

import com.example.gov_scheme_backend.disbursement.dto.ConfigurePlanRequest;
import com.example.gov_scheme_backend.disbursement.model.DisbursementMilestone;

import java.util.List;

public interface DisbursementService {
    List<DisbursementMilestone> configurePlan(Long planId, ConfigurePlanRequest req);
    void releaseMilestone(Long milestoneId);
}
