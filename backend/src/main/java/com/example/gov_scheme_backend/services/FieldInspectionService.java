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
     * Submits a field inspection report for an application, setting the status to INSPECTION_COMPLETED.
     */
    void submitInspectionReport(InspectionSubmitRequest request, Users officer);
}
