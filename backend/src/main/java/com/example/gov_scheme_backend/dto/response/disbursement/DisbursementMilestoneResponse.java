package com.example.gov_scheme_backend.dto.response.disbursement;

import com.example.gov_scheme_backend.enums.MilestoneStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementMilestoneResponse {
    private Long milestoneId;
    private Integer stageNumber;
    private String milestoneName;
    private BigDecimal amountToRelease;
    private LocalDate dueDate;
    private MilestoneStatus completionStatus;
    private LocalDate completedDate;
    private BigDecimal amountReleased;
    private LocalDate releaseDate;
    private String resolvedReason;
    private LocalDate resolvedDate;
    private String proofDocumentUrl;
    private String fileName;
    private String proofNotes;
}
