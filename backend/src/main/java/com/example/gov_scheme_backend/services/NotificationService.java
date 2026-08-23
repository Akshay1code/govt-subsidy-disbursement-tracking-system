package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.notification.NotificationResponse;
import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.NotificationType;

import java.util.List;

/**
 * Central notification service.
 *
 * <p>Every business event that needs to inform a user routes through
 * {@code createAndPublishNotification}, which is the single place that (a)
 * persists the notification (the DB is the source of truth) and (b) publishes
 * it over the WebSocket for real-time delivery. Controllers/services must not
 * build their own notification-publishing paths.
 */
public interface NotificationService {

    /** Newest-first notifications for the bell's initial load / REST resync. */
    List<NotificationResponse> getMyNotifications(Users user);

    /** Unread count for the bell badge. */
    long getUnreadCount(Users user);

    /** Marks a single notification read (verifying ownership). */
    NotificationResponse markAsRead(Long notificationId, Users user);

    /** Marks every unread notification for the user read; returns the number updated. */
    int markAllAsRead(Users user);

    /**
     * Canonical entry point: persist + real-time publish.
     *
     * @param applicationId optional id of the originating application, for frontend deep-linking (nullable)
     */
    Notification createAndPublishNotification(Users user, String message, NotificationType type,
                                              Long milestoneId, Long applicationId);

    /** Backwards-compatible convenience overload (no application link). */
    Notification createAndPublishNotification(Users user, String message, NotificationType type, Long milestoneId);

}
