package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "disbursement_plan")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;


    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "total_stages", nullable = false)
    private Integer totalStages;

    @Column(name = "finance_officer_id")
    private Long financeOfficerId;
}
