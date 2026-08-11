package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.stage.ReviewResponse;
import com.example.gov_scheme_backend.entities.ApplicationReview;
import com.example.gov_scheme_backend.services.StageApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/gov/stage-approval")
@RequiredArgsConstructor
public class StageApprovalController {

    private final StageApprovalService stageApprovalService;

    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<String> approveApplication(
            @PathVariable Long applicationId,
            @RequestParam Long officerId,
            @RequestParam(required = false) String remarks) {

        stageApprovalService.approveApplication(
                applicationId,
                officerId,
                remarks
        );

        return ResponseEntity.ok(
                "Application approved and forwarded to the next stage"
        );
    }

    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<String> rejectApplication(
            @PathVariable Long applicationId,
            @RequestParam Long officerId,
            @RequestParam String remarks) {

        stageApprovalService.rejectApplication(
                applicationId,
                officerId,
                remarks
        );

        return ResponseEntity.ok(
                "Application rejected"
        );
    }

    @GetMapping("/application/{applicationId}")
    public ResponseEntity<List<ReviewResponse>> getApplicationReviews(
            @PathVariable Long applicationId) {

        return ResponseEntity.ok(
                stageApprovalService.getApplicationReviews(applicationId)
        );
    }
}