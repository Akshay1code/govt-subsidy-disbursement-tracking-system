package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.SchemeCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchemeCategoryRepository extends JpaRepository<SchemeCategory, Integer> {

    boolean existsByCategoryNameIgnoreCase(String categoryName);

}