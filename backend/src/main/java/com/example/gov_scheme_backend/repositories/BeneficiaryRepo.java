package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Beneficiary;
import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepo extends JpaRepository<Beneficiary, Long> {

    boolean existsByApplication_Id(Long applicationId);

    Optional<Beneficiary> findByUser_Username(String username);

    // Find beneficiaries whose application has the given status and which have not yet been disbursed
    java.util.List<Beneficiary> findByApplication_StatusAndDisbursedAmountIsNull(com.example.gov_scheme_backend.enums.ApplicationStatus status);

    // Find all flagged beneficiaries
    java.util.List<Beneficiary> findByIsFlaggedTrue();
}
