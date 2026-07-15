package com.example.gov_scheme_backend.dto;

import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import com.example.gov_scheme_backend.enums.Category;
import com.example.gov_scheme_backend.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BeneficiaryResponseDTO {
    private Long id;
    private String beneficiaryId;
    private String fullName;
    private String aadhaarNumber;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String mobileNumber;
    private String email;
    private String fatherName;
    private String occupation;
    private BigDecimal annualIncome;
    private Category category;
    private String address;
    private String village;
    private String mandal;
    private String district;
    private String state;
    private String pincode;
    private String bankAccountNumber;
    private String ifscCode;
    private String bankName;
    private BigDecimal landArea;
    private String landSurveyNumber;
    private BeneficiaryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
