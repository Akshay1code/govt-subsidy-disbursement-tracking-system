package com.example.gov_scheme_backend.dto.response;

import com.example.gov_scheme_backend.enums.ApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationResponseDTO {

    private Long applicationId;

    private String applicationCode;

    private Long beneficiaryId;

    private Integer schemeId;

    private ApplicationStatus status;

    private String remarks;

    private LocalDateTime createdAt;
}