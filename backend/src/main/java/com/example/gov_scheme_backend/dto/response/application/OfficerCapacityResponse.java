package com.example.gov_scheme_backend.dto.response.application;

public record OfficerCapacityResponse(
        Long officerId,
        String uniqueId,
        String fullName,
        String role,
        Integer allocationLimit,
        Long currentAssignedCount,
        Integer remainingCapacity
) {}
