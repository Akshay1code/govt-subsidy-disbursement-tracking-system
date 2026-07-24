package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import com.example.gov_scheme_backend.models.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    Optional<Beneficiary> findByBeneficiaryId(String beneficiaryId);

    Optional<Beneficiary> findByAadhaarNumber(String aadhaarNumber);

    Optional<Beneficiary> findByMobileNumber(String mobileNumber);

    boolean existsByAadhaarNumber(String aadhaarNumber);

    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByAadhaarNumberAndIdNot(String aadhaarNumber, Long id);

    boolean existsByMobileNumberAndIdNot(String mobileNumber, Long id);

    List<Beneficiary> findByStatus(BeneficiaryStatus status);

    Optional<Beneficiary> findByIdAndStatus(Long id, BeneficiaryStatus status);

    List<Beneficiary> findByFullNameContainingIgnoreCaseAndStatus(String fullName, BeneficiaryStatus status);

    List<Beneficiary> findByAadhaarNumberContainingAndStatus(String aadhaarNumber, BeneficiaryStatus status);

    List<Beneficiary> findByMobileNumberContainingAndStatus(String mobileNumber, BeneficiaryStatus status);
}
