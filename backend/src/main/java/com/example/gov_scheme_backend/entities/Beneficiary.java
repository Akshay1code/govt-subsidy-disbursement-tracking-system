package com.example.gov_scheme_backend.entities;
import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import jakarta.persistence.Id;

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
    private BeneficiaryStatus currentStatus;
    private LocalDate approvedDate;
    private LocalDate disbursedDate;
    private String remarks;
    @Column(nullable = false)
    private Boolean isFlagged = false;
    @Column
    private String flagReason;

}