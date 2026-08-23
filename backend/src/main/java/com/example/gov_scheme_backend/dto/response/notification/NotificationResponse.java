package com.example.gov_scheme_backend.dto.response.notification;

import com.example.gov_scheme_backend.entities.Notification;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Clean, transport-safe view of a {@link Notification}.
 *
 * <p>This is the ONLY shape that ever leaves the backend for a notification —
 * both over REST (the bell's initial load / mark-as-read) and over the STOMP
 * WebSocket (real-time push). It deliberately excludes the {@code Users user}
 * association so a recipient's password hash, JWT, or any other user field can
 * never leak into a notification payload.
 *
 * <p>The boolean is pinned to the JSON key {@code isRead} via {@link JsonProperty}
 * so the field name matches what the existing frontend bell already reads,
 * regardless of Lombok/Jackson boolean-getter naming.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long id;

    private String message;

    /** Enum name, e.g. "MILESTONE_READY" — the frontend compares this as a string. */
    private String notificationType;

    private LocalDate sentDate;

    private LocalDateTime createdAt;

    private Long milestoneId;

    /** Nullable link to the originating application, for frontend deep-linking. */
    private Long applicationId;

    @JsonProperty("isRead")
    private boolean isRead;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .message(n.getMessage())
                .notificationType(n.getNotificationType() != null ? n.getNotificationType().name() : null)
                .sentDate(n.getSentDate())
                .createdAt(n.getCreatedAt())
                .milestoneId(n.getMilestoneId())
                .applicationId(n.getApplicationId())
                .isRead(n.isRead())
                .build();
    }
}
