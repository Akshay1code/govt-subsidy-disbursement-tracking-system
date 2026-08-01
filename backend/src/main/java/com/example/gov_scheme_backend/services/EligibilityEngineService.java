package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;

public interface EligibilityEngineService {
    public double validateFields(Long applicationId);
}
