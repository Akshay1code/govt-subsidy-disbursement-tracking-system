package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.inspection.InspectionSubmitRequest;
import com.example.gov_scheme_backend.dto.response.inspection.InspectionContextResponse;
import com.example.gov_scheme_backend.dto.request.workflow.WorkflowActionRequest;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.FieldInspection;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.WorkflowAction;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.FieldInspectionRepo;
import com.example.gov_scheme_backend.services.FieldInspectionService;
import com.example.gov_scheme_backend.services.WorkflowService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FieldInspectionServiceImpl implements FieldInspectionService {

    private final ApplicationRepo applicationRepo;
    private final FieldInspectionRepo fieldInspectionRepo;
    private final WorkflowService workflowService;

    @Override
    public InspectionContextResponse getInspectionContext(Long applicationId) {
        Application app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        InspectionContextResponse.InspectionContextResponseBuilder builder = InspectionContextResponse.builder()
                .applicationId(app.getId())
                .applicationCode(app.getApplicationCode())
                .beneficiaryName(app.getUser() != null ? app.getUser().getFullName() : "Unknown")
                .schemeName(app.getScheme() != null ? app.getScheme().getSchemeName() : "Unknown")
                .district(app.getUser() != null ? app.getUser().getDistrict() : "")
                .state(app.getUser() != null ? app.getUser().getState() : "")
                .inspectionLocation(buildLocation(app));

        // Pre-fill from the latest submitted inspection if present
        Optional<FieldInspection> latestOpt =
                fieldInspectionRepo.findTopByApplicationIdOrderBySubmittedAtDesc(applicationId);
        latestOpt.ifPresent(fi -> builder
                .addressVerified(fi.getAddressVerified())
                .businessActivityConfirmed(fi.getBusinessActivityConfirmed())
                .assetsInspected(fi.getAssetsInspected())
                .notes(fi.getNotes())
                .evidenceMediaIds(fi.getEvidenceMediaIds())
                .lastSubmittedAt(fi.getSubmittedAt()));

        return builder.build();
    }

    @Override
    @Transactional
    public void submitInspectionReport(InspectionSubmitRequest request, Users officer) {
        Application app = applicationRepo.findById(request.getApplicationId())
                .orElseThrow(() -> new RuntimeException("Application not found: " + request.getApplicationId()));

        FieldInspection inspection = FieldInspection.builder()
                .application(app)
                .officer(officer)
                .addressVerified(Boolean.TRUE.equals(request.getAddressVerified()))
                .businessActivityConfirmed(Boolean.TRUE.equals(request.getBusinessActivityConfirmed()))
                .assetsInspected(Boolean.TRUE.equals(request.getAssetsInspected()))
                .notes(request.getNotes())
                .evidenceMediaIds(request.getEvidenceMediaIds())
                .build();

        fieldInspectionRepo.save(inspection);

        // The Field Officer's job ends at "inspect and forward" — they do not
        // approve or reject. This call advances the real workflow from
        // FIELD_OFFICER to REGIONAL_OFFICER in the same transaction, so the
        // case never stalls. The Regional Officer makes the actual
        // approve/reject decision later, after reviewing this report via
        // getInspectionContext(). INSPECTION_COMPLETED is intentionally not
        // persisted as a standalone status — processAction() below sets the
        // application's real next status (UNDER_REVIEW).
        WorkflowActionRequest workflowRequest = new WorkflowActionRequest();
        workflowRequest.setAction(WorkflowAction.APPROVE);
        workflowRequest.setRemarks("Field inspection completed. Forwarded to Regional Officer for review.");

        workflowService.processAction(request.getApplicationId(), workflowRequest, officer);
    }

    private String buildLocation(Application app) {
        if (app.getUser() == null) return "Unknown Location";
        String district = app.getUser().getDistrict();
        String state = app.getUser().getState();
        if (district != null && state != null) return district + ", " + state;
        if (district != null) return district;
        if (state != null) return state;
        return "Unknown Location";
    }
}
