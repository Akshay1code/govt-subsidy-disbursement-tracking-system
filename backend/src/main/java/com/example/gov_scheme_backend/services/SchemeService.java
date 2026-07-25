package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.schemes.SchemesDto;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
public interface SchemeService {
    public ApiResponse addService(SchemesDto req);
}
