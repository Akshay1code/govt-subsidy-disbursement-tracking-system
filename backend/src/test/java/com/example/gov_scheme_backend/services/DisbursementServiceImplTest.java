package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.disbursement.StageConfigurationRequest;
import com.example.gov_scheme_backend.dto.request.disbursement.StageDto;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.DisbursementMilestone;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.enums.MilestoneStatus;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.DisbursementMilestoneRepo;
import com.example.gov_scheme_backend.repositories.DisbursementPlanRepo;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.repositories.SchemeCategoryRepository;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.impl.DisbursementServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the P1 disbursement guards:
 *  - strict sequential release (a stage cannot be released until every prior
 *    stage has actually been RELEASED, not merely COMPLETED),
 *  - budget over-disbursement protection against the scheme's allocated funds,
 *  - null stage-field rejection during plan configuration.
 */
@ExtendWith(MockitoExtension.class)
class DisbursementServiceImplTest {

    @Mock private DisbursementPlanRepo planRepo;
    @Mock private DisbursementMilestoneRepo milestoneRepo;
    @Mock private ApplicationRepo applicationRepo;
    @Mock private SchemeRepo schemeRepo;
    @Mock private UserRepo userRepo;
    @Mock private AuditLogRepo auditLogRepo;
    @Mock private SchemeCategoryRepository schemeCategoryRepository;
    @Mock private NotificationRepo notificationRepo;

    @InjectMocks
    private DisbursementServiceImpl disbursementService;

    @Test
    void releaseMilestone_blockedWhenPriorStageCompletedButNotReleased() {
        DisbursementPlan plan = DisbursementPlan.builder()
                .planId(1L).applicationId(10L).totalAmount(1000.0).totalStages(2).build();

        DisbursementMilestone stage1 = DisbursementMilestone.builder()
                .milestoneId(11L).plan(plan).stageNumber(1).milestoneName("Initial")
                .amountToRelease(500.0).completionStatus(MilestoneStatus.COMPLETED).build();
        DisbursementMilestone stage2 = DisbursementMilestone.builder()
                .milestoneId(12L).plan(plan).stageNumber(2).milestoneName("Final")
                .amountToRelease(500.0).completionStatus(MilestoneStatus.COMPLETED).build();

        when(milestoneRepo.findById(12L)).thenReturn(Optional.of(stage2));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(plan)).thenReturn(List.of(stage1, stage2));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> disbursementService.releaseMilestone(12L));

        assertTrue(ex.getMessage().contains("Stage 1 has been released"),
                "Expected sequential-release message, got: " + ex.getMessage());
        // Nothing is mutated or persisted when the guard trips.
        verify(milestoneRepo, never()).save(any());
        verify(schemeRepo, never()).save(any());
    }

    @Test
    void releaseMilestone_blockedWhenReleaseExceedsAllocatedFunds() {
        DisbursementPlan plan = DisbursementPlan.builder()
                .planId(2L).applicationId(20L).totalAmount(100000.0).totalStages(1).build();

        DisbursementMilestone stage1 = DisbursementMilestone.builder()
                .milestoneId(21L).plan(plan).stageNumber(1).milestoneName("Initial")
                .amountToRelease(60000.0).completionStatus(MilestoneStatus.COMPLETED).build();

        when(milestoneRepo.findById(21L)).thenReturn(Optional.of(stage1));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(plan)).thenReturn(List.of(stage1));

        Schemes scheme = new Schemes();
        scheme.setAllocatedFunds(50000.0); // less than the 60000 release
        scheme.setBudgetUsed(0.0);
        Application app = new Application();
        app.setId(20L);
        app.setScheme(scheme);
        when(applicationRepo.findById(20L)).thenReturn(Optional.of(app));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> disbursementService.releaseMilestone(21L));

        assertTrue(ex.getMessage().toLowerCase().contains("exceed"),
                "Expected an over-disbursement message, got: " + ex.getMessage());
        // The scheme budget must not be advanced when the release is rejected.
        verify(schemeRepo, never()).save(any());
    }

    @Test
    void configurePlan_rejectsNullStageNumber() {
        DisbursementPlan plan = DisbursementPlan.builder()
                .planId(3L).applicationId(30L).totalAmount(1000.0).totalStages(1).build();
        when(planRepo.findById(3L)).thenReturn(Optional.of(plan));

        StageDto bad = new StageDto(null, "Stage X", 1000.0, LocalDate.now().plusDays(10));
        StageConfigurationRequest req = new StageConfigurationRequest(List.of(bad));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> disbursementService.configurePlan(3L, req));

        assertTrue(ex.getMessage().contains("Stage number is required"),
                "Expected a null stage-number message, got: " + ex.getMessage());
        verify(milestoneRepo, never()).save(any());
    }
}
