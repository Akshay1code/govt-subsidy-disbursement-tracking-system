package com.example.gov_scheme_backend.dto.request.beneficiary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaryRequestDTO {
    private String uniqueID;
    private Long applicationId;
    private Double sanctionedAmount;
    private Double disbursedAmount;
    private LocalDate approvedDate;
    private LocalDate disbursedDate;
    private String remarks;
}