package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;

import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;

public interface EligibilityEngineService {
    public EligibilityEngineScoreDTO validateFields(Long applicationId);
}
