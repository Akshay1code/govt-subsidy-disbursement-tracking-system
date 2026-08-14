package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepo extends JpaRepository<Application, Long> {

    Optional<Application> findByApplicationCode(String applicationCode);

    Optional<Application> findByUser_IdAndScheme_SchemeCode(
            Long userId,
            String schemeCode
    );

    List<Application> findByScheme_SchemeCode(String schemeCode);

    List<Application> findByUser_District(String district);

    List<Application> findByUser_Region(String region);

    List<Application> findByStatus(ApplicationStatus status);

    @Query("""
    SELECT a.user.region, COUNT(a.id)
    FROM Application a
    GROUP BY a.user.region
    ORDER BY a.user.region
""")
    List<Object[]> countApplicationsByRegion();

    @Query("""
    SELECT
        COUNT(a),
        SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status = 'UNDER_REVIEW' THEN 1 ELSE 0 END)
    FROM Application a
""")
    Object[] getApplicationPerformance();
}



