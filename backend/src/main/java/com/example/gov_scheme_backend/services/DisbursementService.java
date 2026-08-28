package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.disbursement.StageConfigurationRequest;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementMilestoneResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.DisbursementPlanResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.MilestoneContextResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.OverdueMilestoneResponse;
import com.example.gov_scheme_backend.dto.response.disbursement.SuggestedStagesResponse;
import com.example.gov_scheme_backend.entities.Notification;

import java.util.List;

public interface DisbursementService {
    DisbursementPlanResponse configurePlan(Long planId, StageConfigurationRequest request);
    DisbursementMilestoneResponse completeMilestone(Long milestoneId);
    DisbursementMilestoneResponse releaseMilestone(Long milestoneId);
    DisbursementPlanResponse getPlanByApplication(Long applicationId);
    DisbursementPlanResponse getPlanById(Long planId);
    DisbursementPlanResponse seedData();

    void sendUpcomingReminders();
    void flagOverdueMilestones();
    DisbursementMilestoneResponse resolveMilestone(Long milestoneId, String reason);
    List<OverdueMilestoneResponse> getOverdueMilestonesReport();
    List<Notification> getUserNotifications(String username);

    // Staged Proof Lifecycle
    DisbursementMilestoneResponse submitProof(Long milestoneId, org.springframework.web.multipart.MultipartFile file, String notes);
    DisbursementMilestoneResponse rejectProof(Long milestoneId, com.example.gov_scheme_backend.dto.request.disbursement.MilestoneProofRejectRequest request);

    SuggestedStagesResponse suggestStages(Long planId);
    MilestoneContextResponse getMilestoneContext(Long milestoneId);
}
