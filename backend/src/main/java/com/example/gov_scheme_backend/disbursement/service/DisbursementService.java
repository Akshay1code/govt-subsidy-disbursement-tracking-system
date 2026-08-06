package com.example.disbursement.service;

import com.example.disbursement.dto.ConfigurePlanRequest;
import com.example.disbursement.model.DisbursementMilestone;

import java.util.List;

public interface DisbursementService {
    List<DisbursementMilestone> configurePlan(Long planId, ConfigurePlanRequest req);
    void releaseMilestone(Long milestoneId);
}
