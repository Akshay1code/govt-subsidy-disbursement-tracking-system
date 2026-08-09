package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepo extends JpaRepository<Application, Long> {
    Optional<Application> findByApplicationCode(String applicationCode);
    Optional<Application> findByUser_IdAndScheme_SchemeCode(Long userId, String schemeCode);
}
