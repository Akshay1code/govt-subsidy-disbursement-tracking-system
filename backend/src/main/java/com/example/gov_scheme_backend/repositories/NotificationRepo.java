package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Long> {
    boolean existsByMilestoneIdAndSentDate(Long milestoneId, LocalDate sentDate);
    List<Notification> findByUserOrderBySentDateDesc(Users user);
}
