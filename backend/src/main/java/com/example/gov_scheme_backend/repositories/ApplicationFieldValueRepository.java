package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.ApplicationFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationFieldValueRepository
        extends JpaRepository<ApplicationFieldValue, Long> {

    List<ApplicationFieldValue> findByApplicationId(Long applicationId);

}