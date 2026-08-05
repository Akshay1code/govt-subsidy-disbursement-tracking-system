package com.example.disbursement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.disbursement.model.Scheme;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, Long> {
}
