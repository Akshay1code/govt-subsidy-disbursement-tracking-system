package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;

public interface ApplicationService {

    ApplicationResponseDTO submitApplication(ApplicationRequestDTO request);

}