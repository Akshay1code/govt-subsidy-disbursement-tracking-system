package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.SchemeRequiredDocument;
import com.example.gov_scheme_backend.entities.Schemes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchemeRequiredDocumentRepo extends JpaRepository<SchemeRequiredDocument, Long> {
    List<SchemeRequiredDocument> findByScheme(Schemes scheme);
}
