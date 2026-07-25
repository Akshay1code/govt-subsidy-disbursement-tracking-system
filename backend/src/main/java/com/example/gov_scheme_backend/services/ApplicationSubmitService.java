package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.ApplicationSubmitRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;

public interface ApplicationSubmitService {

    ApiResponse submitApplication(ApplicationSubmitRequestDTO request);

}