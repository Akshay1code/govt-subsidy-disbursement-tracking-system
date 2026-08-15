package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/gov/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<Notification> getMyNotifications(
            @AuthenticationPrincipal Users currentUser) {

        return notificationService.getMyNotifications(currentUser);
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public Notification markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Users currentUser) {

        return notificationService.markAsRead(
                notificationId,
                currentUser
        );
    }
}