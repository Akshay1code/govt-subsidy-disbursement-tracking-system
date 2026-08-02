package com.example.gov_scheme_backend.dto.response.beneficiary;

import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaryResponseDTO {
    private Long id;
    private String uniqueID;
    private Long applicationId;
    private Double sanctionedAmount;
    private Double disbursedAmount;
    private BeneficiaryStatus currentStatus;
    private LocalDate approvedDate;
    private LocalDate disbursedDate;
    private String remarks;
    private Boolean isFlagged;
    private String flagReason;
}