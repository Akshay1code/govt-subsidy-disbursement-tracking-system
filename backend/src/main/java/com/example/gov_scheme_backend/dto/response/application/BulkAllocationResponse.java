package com.example.gov_scheme_backend.dto.response.application;

public record BulkAllocationResponse(
        boolean success,
        String message,
        int allocatedCount,
        String officerName,
        String stage,
        int remainingCapacityAfter
) {}
