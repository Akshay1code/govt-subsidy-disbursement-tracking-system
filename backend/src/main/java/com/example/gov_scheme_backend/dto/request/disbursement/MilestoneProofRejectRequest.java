package com.example.gov_scheme_backend.dto.request.disbursement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneProofRejectRequest {
    private String reason;
}