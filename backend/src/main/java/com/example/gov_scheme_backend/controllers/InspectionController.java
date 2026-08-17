package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.inspection.InspectionSubmitRequest;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.inspection.InspectionContextResponse;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.services.FieldInspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/officer")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class InspectionController {

    private final FieldInspectionService fieldInspectionService;

    /**
     * GET /api/officer/applications/{applicationId}/inspection
     * Returns beneficiary context and any pre-existing inspection state.
     */
    @GetMapping("/applications/{applicationId}/inspection")
    public ResponseEntity<InspectionContextResponse> getInspectionContext(
            @PathVariable Long applicationId) {
        return ResponseEntity.ok(fieldInspectionService.getInspectionContext(applicationId));
    }

    /**
     * POST /api/officer/inspections/submit
     * Submits the field inspection report for a given application.
     */
    @PostMapping("/inspections/submit")
    public ResponseEntity<ApiResponse> submitInspection(
            @RequestBody InspectionSubmitRequest request,
            @AuthenticationPrincipal Users currentUser) {
        fieldInspectionService.submitInspectionReport(request, currentUser);
        return ResponseEntity.ok(new ApiResponse(true, "Inspection Report Submitted Successfully"));
    }
}
