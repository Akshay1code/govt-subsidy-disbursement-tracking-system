package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.notification.NotificationResponse;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/gov/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<NotificationResponse> getMyNotifications(
            @AuthenticationPrincipal Users currentUser) {

        return notificationService.getMyNotifications(currentUser);
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Long> getUnreadCount(
            @AuthenticationPrincipal Users currentUser) {

        return Map.of("unreadCount", notificationService.getUnreadCount(currentUser));
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public NotificationResponse markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Users currentUser) {

        return notificationService.markAsRead(notificationId, currentUser);
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Integer> markAllAsRead(
            @AuthenticationPrincipal Users currentUser) {

        return Map.of("updated", notificationService.markAllAsRead(currentUser));
    }
}
