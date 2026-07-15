package com.example.gov_scheme_backend.models;

import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import com.example.gov_scheme_backend.enums.Category;
import com.example.gov_scheme_backend.enums.Gender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "beneficiaries")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Beneficiary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String beneficiaryId;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 12)
    private String aadhaarNumber;

    @Column(nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Column(nullable = false, unique = true, length = 10)
    private String mobileNumber;

    @Column(length = 120)
    private String email;

    @Column(nullable = false, length = 100)
    private String fatherName;

    @Column(length = 80)
    private String occupation;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal annualIncome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(nullable = false, length = 80)
    private String village;

    @Column(nullable = false, length = 80)
    private String mandal;

    @Column(nullable = false, length = 80)
    private String district;

    @Column(nullable = false, length = 80)
    private String state;

    @Column(nullable = false, length = 6)
    private String pincode;

    @Column(nullable = false, length = 30)
    private String bankAccountNumber;

    @Column(nullable = false, length = 11)
    private String ifscCode;

    @Column(nullable = false, length = 120)
    private String bankName;

    @Column(precision = 10, scale = 2)
    private BigDecimal landArea;

    @Column(length = 80)
    private String landSurveyNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BeneficiaryStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
