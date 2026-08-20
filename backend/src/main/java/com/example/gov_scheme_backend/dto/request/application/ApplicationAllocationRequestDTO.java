package com.example.gov_scheme_backend.dto.request.application;

import lombok.Data;

@Data
public class ApplicationAllocationRequestDTO {
    private Long applicationId;
    private String officerId;
}
