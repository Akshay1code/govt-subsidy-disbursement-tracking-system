package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApplicationFieldValueResponseDTO;

import java.util.List;

public interface ApplicationFieldValueService {


    List<ApplicationFieldValueResponseDTO> saveFields(
            Long applicationId,
            List<ApplicationFieldValueRequestDTO> requests
    );


    List<ApplicationFieldValueResponseDTO> getFields(
            Long applicationId
    );

}