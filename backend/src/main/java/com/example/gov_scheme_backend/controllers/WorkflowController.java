package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.workflow.WorkflowActionRequest;
import com.example.gov_scheme_backend.dto.response.workflow.WorkflowResponse;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.services.WorkflowService;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/gov/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @PreAuthorize("hasAnyRole('FIELD_OFFICER','DISTRICT_OFFICER','REGIONAL_OFFICER','FINANCE_OFFICER')")
    @PostMapping("/{applicationId}/action")
    public WorkflowResponse processAction(
            @PathVariable Long applicationId,
            @Valid @RequestBody WorkflowActionRequest request,
            @AuthenticationPrincipal Users currentUser) {

        return workflowService.processAction(
                applicationId,
                request,
                currentUser
        );
    }
}