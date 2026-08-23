package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.response.notification.NotificationResponse;
import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.NotificationType;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    /** STOMP user-destination the frontend subscribes to (resolved to /user/{name}/queue/notifications). */
    private static final String USER_QUEUE = "/queue/notifications";

    private final NotificationRepo notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Users user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Users user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Users user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        // A user may only mark their OWN notifications — this enforces the
        // per-user isolation guarantee at the persistence boundary.
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("Access denied");
        }

        notification.setRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public int markAllAsRead(Users user) {
        return notificationRepository.markAllAsReadForUser(user);
    }

    @Override
    @Transactional
    public Notification createAndPublishNotification(Users user, String message, NotificationType type, Long milestoneId) {
        return createAndPublishNotification(user, message, type, milestoneId, null);
    }

    @Override
    @Transactional
    public Notification createAndPublishNotification(Users user, String message, NotificationType type,
                                                     Long milestoneId, Long applicationId) {
        Notification notification = Notification.builder()
                .user(user)
                .message(message)
                .sentDate(LocalDate.now())
                .isRead(false)
                .notificationType(type != null ? type : NotificationType.GENERAL)
                .milestoneId(milestoneId)
                .applicationId(applicationId)
                .build();

        // 1) DB is the source of truth — persist first, always.
        Notification saved = notificationRepository.save(notification);

        // 2) Real-time delivery is best-effort and must happen only AFTER the
        //    surrounding transaction commits, so a client is never told about a
        //    notification that a later rollback would erase. Build the transport
        //    DTO now (never publish the entity — it carries the lazy Users).
        NotificationResponse payload = NotificationResponse.from(saved);
        String recipient = user.getUsername();
        publishAfterCommit(recipient, payload);

        return saved;
    }

    /**
     * Publishes after commit when a transaction is active, otherwise immediately.
     * WebSocket delivery is intentionally decoupled from transactional success:
     * the row is already durable, so a failed push just means the client picks it
     * up on its next REST resync.
     */
    private void publishAfterCommit(String recipient, NotificationResponse payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doPublish(recipient, payload);
                }
            });
        } else {
            doPublish(recipient, payload);
        }
    }

    private void doPublish(String recipient, NotificationResponse payload) {
        try {
            messagingTemplate.convertAndSendToUser(recipient, USER_QUEUE, payload);
        } catch (Exception e) {
            // Never fail (or roll back) business flow because a socket push failed.
            log.warn("Real-time notification push to '{}' failed; it remains available via REST. Cause: {}",
                    recipient, e.getMessage());
        }
    }
}
