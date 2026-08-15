package com.example.gov_scheme_backend.enums;

/**
 * Represents the lifecycle status of a disbursement milestone.
 *
 * PENDING: Milestone created, waiting for completion
 * COMPLETED: Beneficiary has submitted proof/completed requirement
 * RELEASED: Funds have been disbursed for this milestone
 * OVERDUE: Due date has passed and milestone is not completed
 */
public enum MilestoneStatus {

    PENDING,
    COMPLETED,
    RELEASED,
    OVERDUE

}