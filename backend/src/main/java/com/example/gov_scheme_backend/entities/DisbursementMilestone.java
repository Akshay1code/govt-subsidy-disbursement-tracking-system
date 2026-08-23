package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.MilestoneStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "disbursement_milestone")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "milestone_id")
    private Long milestoneId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private DisbursementPlan plan;

    @Column(name = "stage_number", nullable = false)
    private Integer stageNumber;

    @Column(name = "milestone_name", nullable = false)
    private String milestoneName;

    @Column(name = "amount_to_release", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountToRelease;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "completion_status", nullable = false)
    private MilestoneStatus completionStatus;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "amount_released", precision = 15, scale = 2)
    private BigDecimal amountReleased;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "resolved_reason", length = 500)
    private String resolvedReason;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;
}
