package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.response.stage.ReviewResponse;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.ReviewStage;
import com.example.gov_scheme_backend.enums.Status;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.entities.ApplicationReview;
import com.example.gov_scheme_backend.repositories.ApplicationReviewRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.StageApprovalService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StageApprovalServiceImpl implements StageApprovalService {

    private final ApplicationRepo applicationRepository;
    private final ApplicationReviewRepo applicationReviewRepository;
    private final UserRepo usersRepository;
    private final com.example.gov_scheme_backend.repositories.AuditLogRepo auditLogRepo;

    @Override
    @Transactional
    public void approveApplication(
            Long applicationId,
            Long officerId,
            String remarks
    ) {

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() ->
                        new RuntimeException("Application not found"));

        Users officer = usersRepository.findById(officerId)
                .orElseThrow(() ->
                        new RuntimeException("Officer not found"));

        // Create review record
        ApplicationReview review = ApplicationReview.builder()
                .application(application)
                .officer(officer)
                .status(Status.APPROVED)
                .remarks(remarks)
                .reviewedAt(LocalDateTime.now())
                .build();

        applicationReviewRepository.save(review);

        // Move application to next stage
        switch (application.getStage()) {

            case FIELD:
                application.setStage(ReviewStage.DISTRICT);
                break;

            case DISTRICT:
                application.setStatus(ApplicationStatus.APPROVED);
                break;
        }

        applicationRepository.save(application);

        // Audit Log
        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(officer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.APPROVE)
                .description("Approved application ID " + applicationId + ". Moved to stage: " + application.getStage() + (remarks != null ? " with remarks: " + remarks : ""))
                .build();
        auditLogRepo.save(audit);
    }

    @Override
    @Transactional
    public void rejectApplication(
            Long applicationId,
            Long officerId,
            String remarks
    ) {

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() ->
                        new RuntimeException("Application not found"));

        Users officer = usersRepository.findById(officerId)
                .orElseThrow(() ->
                        new RuntimeException("Officer not found"));

        // Create rejection record
        ApplicationReview review = ApplicationReview.builder()
                .application(application)
                .officer(officer)
                .status(Status.REJECTED)
                .remarks(remarks)
                .reviewedAt(LocalDateTime.now())
                .build();

        applicationReviewRepository.save(review);

        // Application ends here
        application.setStatus(ApplicationStatus.REJECTED);
        application.setRemarks(remarks);

        applicationRepository.save(application);

        // Audit Log
        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(officer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Rejected application ID " + applicationId + " with remarks: " + remarks)
                .build();
        auditLogRepo.save(audit);
    }

    @Override
    public List<ReviewResponse> getApplicationReviews(Long applicationId) {
        List<ReviewResponse> responses = new ArrayList<>();
        List<ApplicationReview> reviews =
                applicationReviewRepository
                        .findByApplicationIdOrderByReviewedAtAsc(applicationId);

        for (ApplicationReview review : reviews){
            ReviewResponse response = new ReviewResponse(
                    review.getId(),
                    review.getOfficer().getFullName(),
                    review.getStatus(),
                    review.getRemarks(),
                    review.getReviewedAt()
            );
            responses.add(response);
        }
        return responses;
    }
}
