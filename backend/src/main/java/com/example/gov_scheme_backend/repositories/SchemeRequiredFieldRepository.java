package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.SchemeRequiredField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchemeRequiredFieldRepository
        extends JpaRepository<SchemeRequiredField, Long> {

    List<SchemeRequiredField> findBySchemeId(Integer schemeId);
}