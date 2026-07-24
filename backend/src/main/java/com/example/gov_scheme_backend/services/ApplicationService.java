package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApplicationResponseDTO;

public interface ApplicationService {

    ApplicationResponseDTO submitApplication(ApplicationRequestDTO request);

}