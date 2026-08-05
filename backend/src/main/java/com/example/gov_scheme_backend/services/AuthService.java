package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.request.auth.SignupRequest;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.auth.RequestListResponseDto;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Role;

import java.util.List;

public interface AuthService {
    public ApiResponse loginService(LoginRequest user);
    public ApiResponse signupService(SignupRequest req);
    public List<Users> profileService(Role role);
    public ApiResponse deleteProfile();
    public List <RequestListResponseDto> getRequests();
}
