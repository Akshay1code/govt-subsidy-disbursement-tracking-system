package com.example.gov_scheme_backend.dto.auth;

import com.example.gov_scheme_backend.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignupRequest {
    private String fullName;
    private String username;
    private String password;
    private String mobileNo;
    private Role role;
}