package com.example.gov_scheme_backend.dto.response.disbursement;

import com.example.gov_scheme_backend.enums.MilestoneStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneContextResponse {
    private Long milestoneId;
    private Integer stageNumber;
    private String milestoneName;
    private BigDecimal amountToRelease;
    private LocalDate dueDate;
    private MilestoneStatus completionStatus;
    private LocalDate completedDate;

    private Long planId;
    private Long applicationId;
    private String applicationCode;
    private String beneficiaryName;
    private String schemeName;

    private List<DisbursementMilestoneResponse> allMilestones;
}
