package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.entities.DisbursementMilestone;
import com.example.gov_scheme_backend.entities.DisbursementPlan;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.ApplicationDocument;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.dto.response.disbursement.MilestoneContextResponse;
import com.example.gov_scheme_backend.enums.DocumentType;
import com.example.gov_scheme_backend.enums.MilestoneStatus;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.dto.request.disbursement.MilestoneProofRejectRequest;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.AuditLogRepo;
import com.example.gov_scheme_backend.repositories.DisbursementMilestoneRepo;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.entities.Users;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mockito;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DisbursementServiceImplTest {

    private final DisbursementServiceImpl service = new DisbursementServiceImpl();
    private final ApplicationRepo applicationRepo = Mockito.mock(ApplicationRepo.class);
    private final AuditLogRepo auditLogRepo = Mockito.mock(AuditLogRepo.class);
    private final DisbursementMilestoneRepo milestoneRepo = Mockito.mock(DisbursementMilestoneRepo.class);
    private final SchemeRepo schemeRepo = Mockito.mock(SchemeRepo.class);
    private final UserRepo userRepo = Mockito.mock(UserRepo.class);
    private final com.example.gov_scheme_backend.services.CloudinaryService cloudinaryService = Mockito.mock(com.example.gov_scheme_backend.services.CloudinaryService.class);
    private final com.example.gov_scheme_backend.services.NotificationService notificationService = Mockito.mock(com.example.gov_scheme_backend.services.NotificationService.class);

    DisbursementServiceImplTest() {
        ReflectionTestUtils.setField(service, "applicationRepo", applicationRepo);
        ReflectionTestUtils.setField(service, "auditLogRepo", auditLogRepo);
        ReflectionTestUtils.setField(service, "milestoneRepo", milestoneRepo);
        ReflectionTestUtils.setField(service, "schemeRepo", schemeRepo);
        ReflectionTestUtils.setField(service, "userRepo", userRepo);
        ReflectionTestUtils.setField(service, "cloudinaryService", cloudinaryService);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void completeMilestone_completesSubmittedProof() {
        Users financeOfficer = user("finance", Role.FINANCE_OFFICER);
        authenticateAs(financeOfficer);
        DisbursementMilestone milestone = milestone(MilestoneStatus.PROOF_SUBMITTED);
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(milestoneRepo.save(milestone)).thenReturn(milestone);
        when(applicationRepo.findById(1L)).thenReturn(Optional.empty());
        when(userRepo.findByUsername("finance")).thenReturn(Optional.of(financeOfficer));
        when(userRepo.findByRole(any())).thenReturn(List.of());

        service.completeMilestone(1L);

        assertEquals(MilestoneStatus.COMPLETED, milestone.getCompletionStatus());
        verify(milestoneRepo).save(milestone);
    }

    @ParameterizedTest
    @EnumSource(value = MilestoneStatus.class, names = {"PENDING", "PROOF_REJECTED", "COMPLETED", "RELEASED"})
    void completeMilestone_rejectsStatusesOtherThanSubmittedProof(MilestoneStatus status) {
        DisbursementMilestone milestone = milestone(status);
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> service.completeMilestone(1L));

        assertEquals("Milestone status is " + status + " and must be PROOF_SUBMITTED before completion",
                exception.getMessage());
        verify(milestoneRepo, never()).save(any());
    }

    @Test
    void completeMilestone_rejectsNonFinanceOfficer() {
        authenticateAs(user("field", Role.FIELD_OFFICER));
        DisbursementMilestone milestone = milestone(MilestoneStatus.PROOF_SUBMITTED);
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(userRepo.findByUsername("field")).thenReturn(Optional.of(user("field", Role.FIELD_OFFICER)));

        AccessDeniedException exception = assertThrows(AccessDeniedException.class,
                () -> service.completeMilestone(1L));

        assertEquals("Only Finance Officer can perform this action", exception.getMessage());
        verify(milestoneRepo, never()).save(any());
    }

    @Test
    void rejectProof_rejectsSubmittedProofForFinanceOfficer() {
        Users financeOfficer = user("finance", Role.FINANCE_OFFICER);
        authenticateAs(financeOfficer);
        DisbursementMilestone milestone = milestone(MilestoneStatus.PROOF_SUBMITTED);
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(milestoneRepo.save(milestone)).thenReturn(milestone);
        when(applicationRepo.findById(1L)).thenReturn(Optional.empty());
        when(userRepo.findByUsername("finance")).thenReturn(Optional.of(financeOfficer));

        service.rejectProof(1L, new MilestoneProofRejectRequest("Unreadable receipt"));

        assertEquals(MilestoneStatus.PROOF_REJECTED, milestone.getCompletionStatus());
        verify(milestoneRepo).save(milestone);
    }

    @Test
    void rejectProof_rejectsNonFinanceOfficer() {
        authenticateAs(user("field", Role.FIELD_OFFICER));
        DisbursementMilestone milestone = milestone(MilestoneStatus.PROOF_SUBMITTED);
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(userRepo.findByUsername("field")).thenReturn(Optional.of(user("field", Role.FIELD_OFFICER)));

        AccessDeniedException exception = assertThrows(AccessDeniedException.class,
                () -> service.rejectProof(1L, new MilestoneProofRejectRequest("Unreadable receipt")));

        assertEquals("Only Finance Officer can perform this action", exception.getMessage());
        verify(milestoneRepo, never()).save(any());
    }

    @Test
    void getMilestoneContext_returnsLatestSubmittedProofWhenFilenameHasNoStageNumber() {
        DisbursementMilestone milestone = milestone(MilestoneStatus.PROOF_SUBMITTED);
        ApplicationDocument proof = new ApplicationDocument();
        proof.setDocumentType(DocumentType.STAGE_COMPLIANCE_PROOF);
        proof.setFileName("akash-final-receipt.pdf");
        proof.setDocumentUrl("https://files.example/akash-final-receipt.pdf");
        proof.setUploadedAt(LocalDateTime.now());
        Application application = new Application();
        application.setId(1L);
        application.setApplicationCode("APP-230A79FB");
        application.setDocuments(List.of(proof));

        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(milestone.getPlan())).thenReturn(List.of(milestone));
        when(applicationRepo.findById(1L)).thenReturn(Optional.of(application));

        MilestoneContextResponse context = service.getMilestoneContext(1L);

        assertEquals("https://files.example/akash-final-receipt.pdf",
                context.getAllMilestones().get(0).getProofDocumentUrl());
    }

    @Test
    void releaseMilestone_releasesCompletedMilestoneForFinanceOfficer() {
        Users financeOfficer = user("finance", Role.FINANCE_OFFICER);
        authenticateAs(financeOfficer);
        DisbursementMilestone milestone = milestone(MilestoneStatus.COMPLETED);
        Application application = new Application();
        application.setId(1L);
        application.setScheme(scheme());

        when(userRepo.findByUsername("finance")).thenReturn(Optional.of(financeOfficer));
        when(milestoneRepo.findById(1L)).thenReturn(Optional.of(milestone));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(milestone.getPlan())).thenReturn(List.of(milestone));
        when(applicationRepo.findById(1L)).thenReturn(Optional.of(application));

        service.releaseMilestone(1L);

        assertEquals(MilestoneStatus.RELEASED, milestone.getCompletionStatus());
        verify(milestoneRepo).save(milestone);
    }

    @Test
    void releaseMilestone_rejectsNonFinanceOfficer() {
        authenticateAs(user("field", Role.FIELD_OFFICER));
        when(userRepo.findByUsername("field")).thenReturn(Optional.of(user("field", Role.FIELD_OFFICER)));

        AccessDeniedException exception = assertThrows(AccessDeniedException.class,
                () -> service.releaseMilestone(1L));

        assertEquals("Only Finance Officer can perform this action", exception.getMessage());
        verify(milestoneRepo, never()).findById(any());
        verify(milestoneRepo, never()).save(any());
    }

    @Test
    void submitProof_uploadsToCloudinaryAndSavesDocument() {
        org.springframework.web.multipart.MultipartFile mockFile = Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("stage2-receipt.pdf");
        when(cloudinaryService.uploadFile(mockFile, "govt-scheme-docs"))
                .thenReturn("https://res.cloudinary.com/demo/image/upload/v1234/stage2-receipt.pdf");

        DisbursementMilestone stage1 = DisbursementMilestone.builder()
                .milestoneId(10L)
                .stageNumber(1)
                .completionStatus(MilestoneStatus.RELEASED)
                .build();

        DisbursementMilestone stage2 = milestone(MilestoneStatus.PENDING);
        stage2.setMilestoneId(20L);
        stage2.setStageNumber(2);

        DisbursementPlan plan = stage2.getPlan();
        Application application = new Application();
        application.setId(1L);
        application.setApplicationCode("APP-TEST-001");
        application.setDocuments(new java.util.ArrayList<>());

        when(milestoneRepo.findById(20L)).thenReturn(Optional.of(stage2));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(plan)).thenReturn(List.of(stage1, stage2));
        when(applicationRepo.findById(1L)).thenReturn(Optional.of(application));
        when(milestoneRepo.save(stage2)).thenReturn(stage2);

        var response = service.submitProof(20L, mockFile, "Finished earthwork");

        assertEquals(MilestoneStatus.PROOF_SUBMITTED, stage2.getCompletionStatus());
        verify(cloudinaryService).uploadFile(mockFile, "govt-scheme-docs");
        verify(applicationRepo).save(application);
        verify(milestoneRepo).save(stage2);

        assertEquals(1, application.getDocuments().size());
        ApplicationDocument savedDoc = application.getDocuments().get(0);
        assertEquals(DocumentType.STAGE_COMPLIANCE_PROOF, savedDoc.getDocumentType());
        assertEquals("stage2-receipt.pdf", savedDoc.getFileName());
        assertEquals("https://res.cloudinary.com/demo/image/upload/v1234/stage2-receipt.pdf", savedDoc.getDocumentUrl());
        assertEquals(false, savedDoc.getVerified());
        assertEquals("Finished earthwork", response.getProofNotes());
    }

    @Test
    void submitProof_rejectsWhenPriorStageNotReleased() {
        org.springframework.web.multipart.MultipartFile mockFile = Mockito.mock(org.springframework.web.multipart.MultipartFile.class);

        DisbursementMilestone stage1 = DisbursementMilestone.builder()
                .milestoneId(10L)
                .stageNumber(1)
                .completionStatus(MilestoneStatus.PENDING)
                .build();

        DisbursementMilestone stage2 = milestone(MilestoneStatus.PENDING);
        stage2.setMilestoneId(20L);
        stage2.setStageNumber(2);

        when(milestoneRepo.findById(20L)).thenReturn(Optional.of(stage2));
        when(milestoneRepo.findByPlanOrderByStageNumberAsc(stage2.getPlan())).thenReturn(List.of(stage1, stage2));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.submitProof(20L, mockFile, "Notes"));

        assertEquals("Cannot submit proof for Stage 2 until Stage 1 is released.", ex.getMessage());
        verify(cloudinaryService, never()).uploadFile(any(), any());
    }

    @Test
    void submitProof_rejectsWhenMilestoneAlreadyReleased() {
        org.springframework.web.multipart.MultipartFile mockFile = Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        DisbursementMilestone stage2 = milestone(MilestoneStatus.RELEASED);

        when(milestoneRepo.findById(20L)).thenReturn(Optional.of(stage2));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.submitProof(20L, mockFile, "Notes"));

        assertEquals("Milestone has already been released", ex.getMessage());
        verify(cloudinaryService, never()).uploadFile(any(), any());
    }

    private DisbursementMilestone milestone(MilestoneStatus status) {
        return DisbursementMilestone.builder()
                .milestoneId(1L)
                .plan(DisbursementPlan.builder().applicationId(1L).build())
                .stageNumber(2)
                .milestoneName("Stage 2")
                .amountToRelease(BigDecimal.TEN)
                .completionStatus(status)
                .build();
    }

    private Users user(String username, Role role) {
        Users user = new Users();
        user.setUsername(username);
        user.setRole(role);
        return user;
    }

    private Schemes scheme() {
        Schemes scheme = new Schemes();
        scheme.setAllocatedFunds(new BigDecimal("100.00"));
        scheme.setBudgetUsed(BigDecimal.ZERO);
        return scheme;
    }

    private void authenticateAs(Users user) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(user.getUsername(), null, List.of()));
    }
}
