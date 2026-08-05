package com.example.gov_scheme_backend.dto.request.auth;

import com.example.gov_scheme_backend.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignupRequest {
    String fullName;
    Role role;
    String mobileNo;
    String region;
    String district;
    String state;
    String username;
    String password;
}