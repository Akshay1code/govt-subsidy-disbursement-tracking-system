package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Long> {
    boolean existsByMilestoneIdAndSentDate(Long milestoneId, LocalDate sentDate);
    List<Notification> findByUserOrderBySentDateDesc(Users user);

    // Newest-first by insertion time (more precise than sentDate, which is day-granular).
    List<Notification> findByUserOrderByCreatedAtDesc(Users user);

    // Unread badge count for the notification bell.
    long countByUserAndIsReadFalse(Users user);

    // Bulk "mark all as read" — returns the number of rows updated.
    @Modifying
    @Query("update Notification n set n.isRead = true where n.user = :user and n.isRead = false")
    int markAllAsReadForUser(@Param("user") Users user);
}
