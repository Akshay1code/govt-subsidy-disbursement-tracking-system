package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.ApplicationReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationReviewRepo extends JpaRepository<ApplicationReview,Long> {


    List<ApplicationReview> findByApplicationIdOrderByReviewedAtAsc(Long applicationId);
}
