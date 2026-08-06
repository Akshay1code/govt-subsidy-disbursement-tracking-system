package com.example.gov_scheme_backend.dto.response.disbursement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OverdueMilestoneResponse {
    private Long milestoneId;
    private String beneficiaryName;
    private String schemeName;
    private String milestoneName;
    private LocalDate dueDate;
    private Long daysOverdue;
}
