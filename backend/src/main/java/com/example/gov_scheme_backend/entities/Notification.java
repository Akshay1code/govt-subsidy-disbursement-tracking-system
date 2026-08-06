package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

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

    @Column(name = "milestone_id", nullable = false)
    private Long milestoneId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "sent_date", nullable = false)
    private LocalDate sentDate;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;
}
