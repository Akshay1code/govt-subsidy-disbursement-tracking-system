package com.example.gov_scheme_backend.dto.request.application;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationRequestDTO {

    @NotNull(message = "Beneficiary ID is required")
    private Long beneficiaryId;

    @NotNull(message = "Scheme ID is required")
    private Integer schemeId;

    @Size(max = 500, message = "Remarks cannot exceed 500 characters")
    private String remarks;
}