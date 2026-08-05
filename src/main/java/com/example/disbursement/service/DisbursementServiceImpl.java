package com.example.disbursement.service;

import com.example.disbursement.dto.ConfigurePlanRequest;
import com.example.disbursement.model.AuditLog;
import com.example.disbursement.model.DisbursementMilestone;
import com.example.disbursement.model.DisbursementPlan;
import com.example.disbursement.model.Scheme;
import com.example.disbursement.repository.AuditLogRepository;
import com.example.disbursement.repository.DisbursementMilestoneRepository;
import com.example.disbursement.repository.DisbursementPlanRepository;
import com.example.disbursement.repository.SchemeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class DisbursementServiceImpl implements DisbursementService {

    private final DisbursementPlanRepository planRepo;
    private final DisbursementMilestoneRepository milestoneRepo;
    private final SchemeRepository schemeRepo;
    private final AuditLogRepository auditRepo;

    public DisbursementServiceImpl(DisbursementPlanRepository planRepo,
                                   DisbursementMilestoneRepository milestoneRepo,
                                   SchemeRepository schemeRepo,
                                   AuditLogRepository auditRepo) {
        this.planRepo = planRepo;
        this.milestoneRepo = milestoneRepo;
        this.schemeRepo = schemeRepo;
        this.auditRepo = auditRepo;
    }

    @Override
    public List<DisbursementMilestone> configurePlan(Long planId, ConfigurePlanRequest req) {
        Optional<DisbursementPlan> planOpt = planRepo.findById(planId);
        if (!planOpt.isPresent()) throw new IllegalArgumentException("Plan not found");
        DisbursementPlan plan = planOpt.get();

        if (req.stages == null || req.stages.size() == 0) throw new IllegalArgumentException("No stages provided");
        if (req.stages.size() != plan.getTotalStages()) throw new IllegalArgumentException("Stage count mismatch with plan totalStages");

        long sum = req.stages.stream().mapToLong(s -> s.amount == null ? 0L : s.amount).sum();
        if (sum != plan.getTotalAmount()) throw new IllegalArgumentException("Stage amounts do not sum to total approved grant");

        List<DisbursementMilestone> created = new ArrayList<>();
        int idx = 1;
        for (ConfigurePlanRequest.Stage s : req.stages) {
            DisbursementMilestone m = new DisbursementMilestone();
            m.setPlanId(planId);
            m.setStageNumber(idx);
            m.setMilestoneName(s.milestoneName);
            m.setAmountToRelease(s.amount);
            m.setDueDate(s.dueDate);
            m.setCompletionStatus("PENDING");
            m.setAmountReleased(0L);
            milestoneRepo.save(m);
            created.add(m);
            idx++;
        }
        return created;
    }

    @Override
    @Transactional
    public void releaseMilestone(Long milestoneId) {
        DisbursementMilestone m = milestoneRepo.findById(milestoneId).orElseThrow(() -> new IllegalArgumentException("Milestone not found"));

        if ("RELEASED".equals(m.getCompletionStatus())) throw new IllegalArgumentException("Milestone already released");

        // Check sequential block: if not first stage, previous stage must be COMPLETED or RELEASED
        if (m.getStageNumber() > 1) {
            Optional<DisbursementMilestone> prev = milestoneRepo.findByPlanIdAndStageNumber(m.getPlanId(), m.getStageNumber() - 1);
            if (!prev.isPresent()) throw new IllegalArgumentException("Previous milestone missing");
            String prevStatus = prev.get().getCompletionStatus();
            if (!"COMPLETED".equals(prevStatus) && !"RELEASED".equals(prevStatus)) {
                throw new IllegalArgumentException("Previous milestone not completed");
            }
        }

        // perform release: update milestone, update scheme.budget_used, write audit
        m.setCompletionStatus("RELEASED");
        m.setAmountReleased(m.getAmountToRelease());
        m.setReleaseDate(LocalDateTime.now());
        milestoneRepo.save(m);

        // for simplicity, scheme id == planId
        Scheme scheme = schemeRepo.findById(m.getPlanId()).orElseGet(() -> {
            Scheme s = new Scheme();
            s.setId(m.getPlanId());
            s.setBudgetUsed(0L);
            return s;
        });
        scheme.setBudgetUsed((scheme.getBudgetUsed() == null ? 0L : scheme.getBudgetUsed()) + m.getAmountToRelease());
        schemeRepo.save(scheme);

        AuditLog a = new AuditLog();
        a.setAction("RELEASE");
        a.setEntityName("disbursement_milestone");
        a.setEntityId(m.getMilestoneId());
        a.setCreatedAt(LocalDateTime.now());
        auditRepo.save(a);
    }
}
