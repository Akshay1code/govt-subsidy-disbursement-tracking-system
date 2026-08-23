package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "milestone_id")
    private Long milestoneId;

    // Optional link to the originating application so the frontend can deep-link
    // the notification to the relevant application. Nullable: not every
    // notification is tied to an application (e.g. milestone reminders).
    @Column(name = "application_id")
    private Long applicationId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "sent_date")
    private LocalDate sentDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type")
    @Builder.Default
    private com.example.gov_scheme_backend.enums.NotificationType notificationType =
            com.example.gov_scheme_backend.enums.NotificationType.GENERAL;

    @CreationTimestamp
    private LocalDateTime createdAt;
}