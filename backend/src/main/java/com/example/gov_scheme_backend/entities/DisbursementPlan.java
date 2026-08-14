package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "disbursement_plan")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long planId;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "total_stages", nullable = false)
    private Integer totalStages;
}