package com.example.gov_scheme_backend.models;

import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "beneficiaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @OneToOne
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    private Double sanctionedAmount;

    private Double disbursedAmount;

    @Enumerated(EnumType.STRING)
    private BeneficiaryStatus benefitStatus;

    private LocalDate approvedDate;

    private LocalDate disbursedDate;

    private String remarks;
}
