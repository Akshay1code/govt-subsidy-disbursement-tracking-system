package com.example.disbursement.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "disbursement_milestone")
public class DisbursementMilestone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long milestoneId;

    private Long planId;
    private Integer stageNumber;
    private String milestoneName;
    private Long amountToRelease;
    private LocalDate dueDate;
    private String completionStatus; // PENDING, COMPLETED, RELEASED
    private LocalDateTime completedDate;
    private Long amountReleased;
    private LocalDateTime releaseDate;

    public Long getMilestoneId() { return milestoneId; }
    public void setMilestoneId(Long milestoneId) { this.milestoneId = milestoneId; }
    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }
    public Integer getStageNumber() { return stageNumber; }
    public void setStageNumber(Integer stageNumber) { this.stageNumber = stageNumber; }
    public String getMilestoneName() { return milestoneName; }
    public void setMilestoneName(String milestoneName) { this.milestoneName = milestoneName; }
    public Long getAmountToRelease() { return amountToRelease; }
    public void setAmountToRelease(Long amountToRelease) { this.amountToRelease = amountToRelease; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getCompletionStatus() { return completionStatus; }
    public void setCompletionStatus(String completionStatus) { this.completionStatus = completionStatus; }
    public LocalDateTime getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDateTime completedDate) { this.completedDate = completedDate; }
    public Long getAmountReleased() { return amountReleased; }
    public void setAmountReleased(Long amountReleased) { this.amountReleased = amountReleased; }
    public LocalDateTime getReleaseDate() { return releaseDate; }
    public void setReleaseDate(LocalDateTime releaseDate) { this.releaseDate = releaseDate; }
}
