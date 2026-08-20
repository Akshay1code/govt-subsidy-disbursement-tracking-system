package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Schemes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchemeRepo extends JpaRepository<Schemes, Long> {

    Optional<Schemes> findBySchemeCode(String schemeCode);

    List<Schemes> findByCategory_CategoryNameIgnoreCase(String categoryName);

    @org.springframework.data.jpa.repository.Query("""
        SELECT c.categoryName, SUM(s.allocatedFunds), SUM(s.budgetUsed)
        FROM Schemes s
        JOIN s.category c
        GROUP BY c.categoryName
    """)
    List<Object[]> sumFundsByCategory();
}