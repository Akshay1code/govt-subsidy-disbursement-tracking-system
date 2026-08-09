package com.example.gov_scheme_backend.dto.response.auth;

import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestListResponseDto {
    Integer id;
    String uniqueId;
    String fullName;
    Role role;
    String mobileNo;
    String region;
    String district;
    String state;
    Status status;
    String createdAt;
    String updatedAt;
}
