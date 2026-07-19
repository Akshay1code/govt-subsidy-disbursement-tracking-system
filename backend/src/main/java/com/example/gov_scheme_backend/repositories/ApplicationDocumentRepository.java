package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {

    List<ApplicationDocument> findByApplicationId(Long applicationId);

}