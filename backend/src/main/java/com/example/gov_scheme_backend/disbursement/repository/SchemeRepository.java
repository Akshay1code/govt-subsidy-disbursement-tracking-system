package com.example.gov_scheme_backend.disbursement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.gov_scheme_backend.disbursement.model.Scheme;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, Long> {
}
