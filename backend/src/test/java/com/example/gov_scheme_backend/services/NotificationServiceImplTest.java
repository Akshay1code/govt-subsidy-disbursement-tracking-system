package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.notification.NotificationResponse;
import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.NotificationType;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.NotificationRepo;
import com.example.gov_scheme_backend.services.impl.NotificationServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the central notification service — the single place that
 * persists a notification (source of truth) and publishes it over STOMP.
 *
 * These lock in the guarantees the real-time system depends on:
 *  - persistence always happens (DB first),
 *  - the WebSocket payload is the clean {@link NotificationResponse} DTO (never
 *    the entity, so a recipient's password/JWT can never leak),
 *  - delivery is routed to the correct user via user-destinations,
 *  - real-time push is best-effort: a broker failure never breaks the flow and
 *    the row still persists (offline / disconnected clients resync via REST),
 *  - publishing is deferred until AFTER the surrounding transaction commits,
 *  - per-user isolation: a user may only mark their OWN notifications read.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    private static final String QUEUE = "/queue/notifications";

    @Mock private NotificationRepo notificationRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private Users user(Long id, String username) {
        Users u = new Users();
        u.setId(id);
        u.setUsername(username);
        u.setPassword("$2a$10$secretHashThatMustNeverLeak");
        return u;
    }

    private Notification existing(Long id, Users owner, boolean read) {
        return Notification.builder()
                .id(id).user(owner).message("hello").isRead(read)
                .notificationType(NotificationType.GENERAL).build();
    }

    /** save() echoes back the entity, assigning an id if one is not set (mimics the DB). */
    private void stubSaveEchoes() {
        lenient().when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            if (n.getId() == null) n.setId(42L);
            return n;
        });
    }

    @AfterEach
    void clearTxSync() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    // ---- createAndPublish: persistence + payload + routing --------------------

    @Test
    void createAndPublish_persistsTheNotification() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");

        notificationService.createAndPublishNotification(u, "msg", NotificationType.GENERAL, null, null);

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void createAndPublish_publishesCleanDtoToTheCorrectUser() {
        stubSaveEchoes();
        Users u = user(7L, "officer7");

        notificationService.createAndPublishNotification(
                u, "You have a new application", NotificationType.APPLICATION_ASSIGNED, null, 55L);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq("officer7"), eq(QUEUE), payload.capture());

        // The payload is the DTO, never the entity — so it structurally cannot
        // carry the Users association (and therefore no password/JWT).
        assertTrue(payload.getValue() instanceof NotificationResponse);
        NotificationResponse dto = (NotificationResponse) payload.getValue();
        assertEquals("You have a new application", dto.getMessage());
        assertEquals("APPLICATION_ASSIGNED", dto.getNotificationType());
        assertEquals(55L, dto.getApplicationId());
        assertFalse(dto.isRead());
    }

    @Test
    void createAndPublish_defaultsTypeToGeneralWhenNull() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");

        notificationService.createAndPublishNotification(u, "msg", null, null, null);

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertEquals(NotificationType.GENERAL, saved.getValue().getNotificationType());
    }

    @Test
    void createAndPublish_persistsMilestoneAndApplicationIds() {
        stubSaveEchoes();
        Users u = user(1L, "beneficiary1");

        notificationService.createAndPublishNotification(
                u, "disbursed", NotificationType.DISBURSEMENT_RELEASED, 9L, 88L);

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertEquals(9L, saved.getValue().getMilestoneId());
        assertEquals(88L, saved.getValue().getApplicationId());
    }

    // ---- offline / broker-down resilience ------------------------------------

    @Test
    void createAndPublish_doesNotThrowWhenBrokerFails() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");
        doThrow(new RuntimeException("broker down"))
                .when(messagingTemplate).convertAndSendToUser(any(), any(), any());

        assertDoesNotThrow(() ->
                notificationService.createAndPublishNotification(u, "msg", NotificationType.GENERAL, null, null));
    }

    @Test
    void createAndPublish_stillPersistsWhenBrokerFails() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");
        doThrow(new RuntimeException("broker down"))
                .when(messagingTemplate).convertAndSendToUser(any(), any(), any());

        notificationService.createAndPublishNotification(u, "msg", NotificationType.GENERAL, null, null);

        // The row is durable even though the real-time push failed; the client
        // will pick it up on its next REST resync.
        verify(notificationRepository).save(any(Notification.class));
    }

    // ---- transactional publish safety ----------------------------------------

    @Test
    void createAndPublish_defersPublishUntilAfterCommit_whenTransactionActive() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");
        TransactionSynchronizationManager.initSynchronization(); // simulate an active tx

        notificationService.createAndPublishNotification(u, "msg", NotificationType.GENERAL, null, null);

        // Nothing pushed yet — it must wait for commit.
        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());

        // Simulate the commit.
        List<TransactionSynchronization> syncs = TransactionSynchronizationManager.getSynchronizations();
        assertEquals(1, syncs.size());
        syncs.forEach(TransactionSynchronization::afterCommit);

        verify(messagingTemplate, times(1)).convertAndSendToUser(eq("officer1"), eq(QUEUE), any());
    }

    @Test
    void createAndPublish_publishesImmediately_whenNoTransactionActive() {
        stubSaveEchoes();
        Users u = user(1L, "officer1");

        notificationService.createAndPublishNotification(u, "msg", NotificationType.GENERAL, null, null);

        verify(messagingTemplate, times(1)).convertAndSendToUser(eq("officer1"), eq(QUEUE), any());
    }

    // ---- markAsRead: state + ownership isolation -----------------------------

    @Test
    void markAsRead_setsReadTrue_andReturnsDto() {
        stubSaveEchoes();
        Users owner = user(1L, "officer1");
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(existing(5L, owner, false)));

        NotificationResponse dto = notificationService.markAsRead(5L, owner);

        assertTrue(dto.isRead());
        assertEquals(5L, dto.getId());
    }

    @Test
    void markAsRead_deniesWhenNotOwner() {
        Users owner = user(1L, "officer1");
        Users attacker = user(2L, "officer2");
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(existing(5L, owner, false)));

        assertThrows(AccessDeniedException.class, () -> notificationService.markAsRead(5L, attacker));
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markAsRead_throwsWhenNotFound() {
        Users owner = user(1L, "officer1");
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead(99L, owner));
    }

    // ---- counts / bulk / listing ---------------------------------------------

    @Test
    void getUnreadCount_delegatesToRepository() {
        Users u = user(1L, "officer1");
        when(notificationRepository.countByUserAndIsReadFalse(u)).thenReturn(3L);

        assertEquals(3L, notificationService.getUnreadCount(u));
    }

    @Test
    void markAllAsRead_delegatesAndReturnsUpdatedCount() {
        Users u = user(1L, "officer1");
        when(notificationRepository.markAllAsReadForUser(u)).thenReturn(4);

        assertEquals(4, notificationService.markAllAsRead(u));
    }

    @Test
    void getMyNotifications_returnsDtosInRepositoryOrder() {
        Users u = user(1L, "officer1");
        when(notificationRepository.findByUserOrderByCreatedAtDesc(u))
                .thenReturn(List.of(existing(2L, u, false), existing(1L, u, true)));

        List<NotificationResponse> result = notificationService.getMyNotifications(u);

        assertEquals(2, result.size());
        assertEquals(2L, result.get(0).getId()); // newest-first preserved
        assertEquals(1L, result.get(1).getId());
    }

    @Test
    void getMyNotifications_mapsToTransportSafeDto() {
        Users u = user(1L, "officer1");
        when(notificationRepository.findByUserOrderByCreatedAtDesc(u))
                .thenReturn(List.of(existing(2L, u, false)));

        List<NotificationResponse> result = notificationService.getMyNotifications(u);

        // The returned type is the DTO (no Users association by construction),
        // so the password on `u` can never reach the client through this path.
        assertTrue(result.get(0) instanceof NotificationResponse);
        assertEquals("hello", result.get(0).getMessage());
    }
}
