package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;

public interface ApplicationService {

    EligibilityEngineScoreDTO saveFields(
            Long userId,
            ApplicationFieldValueRequestDTO requests
    );

}