package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.inspection.InspectionSubmitRequest;
import com.example.gov_scheme_backend.dto.response.inspection.InspectionContextResponse;
import com.example.gov_scheme_backend.entities.Users;

public interface FieldInspectionService {

    /**
     * Returns beneficiary context and any pre-existing inspection data for a given application.
     */
    InspectionContextResponse getInspectionContext(Long applicationId);

    /**
     * Submits a field inspection report for an application. Persists the
     * inspection record, then advances the verification workflow from
     * FIELD_OFFICER to DISTRICT_OFFICER stage, in the same transaction.
     * The Field Officer's role is to inspect and forward — the
     * approve/reject decision is made later by the District Officer, who
     * reviews this inspection report as part of that decision.
     */
    void submitInspectionReport(InspectionSubmitRequest request, Users officer);
}
