package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.FieldInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FieldInspectionRepo extends JpaRepository<FieldInspection, Long> {
    Optional<FieldInspection> findTopByApplicationIdOrderBySubmittedAtDesc(Long applicationId);
}
