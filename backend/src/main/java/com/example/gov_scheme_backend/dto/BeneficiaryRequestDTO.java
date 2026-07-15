package com.example.gov_scheme_backend.dto;

import com.example.gov_scheme_backend.enums.Category;
import com.example.gov_scheme_backend.enums.Gender;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BeneficiaryRequestDTO {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Aadhaar number is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Aadhaar number must contain exactly 12 digits")
    private String aadhaarNumber;

    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must contain exactly 10 digits")
    private String mobileNumber;

    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Father name is required")
    private String fatherName;

    private String occupation;

    @NotNull(message = "Annual income is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Annual income cannot be negative")
    private BigDecimal annualIncome;

    @NotNull(message = "Category is required")
    private Category category;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "Village is required")
    private String village;

    @NotBlank(message = "Mandal is required")
    private String mandal;

    @NotBlank(message = "District is required")
    private String district;

    @NotBlank(message = "State is required")
    private String state;

    @NotBlank(message = "Pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Pincode must contain exactly 6 digits")
    private String pincode;

    @NotBlank(message = "Bank account number is required")
    private String bankAccountNumber;

    @NotBlank(message = "IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code should follow standard Indian IFSC format")
    private String ifscCode;

    @NotBlank(message = "Bank name is required")
    private String bankName;

    @DecimalMin(value = "0.0", inclusive = true, message = "Land area cannot be negative")
    private BigDecimal landArea;

    private String landSurveyNumber;
}
