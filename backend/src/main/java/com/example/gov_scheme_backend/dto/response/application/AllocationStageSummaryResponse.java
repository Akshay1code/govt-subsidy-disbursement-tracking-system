package com.example.gov_scheme_backend.dto.response.application;

public record AllocationStageSummaryResponse(
        String stage,
        Long unassignedCount
) {}
