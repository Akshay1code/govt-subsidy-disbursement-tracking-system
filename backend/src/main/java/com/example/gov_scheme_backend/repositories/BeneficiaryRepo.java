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
}
