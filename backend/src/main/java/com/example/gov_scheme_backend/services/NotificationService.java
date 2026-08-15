package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.entities.Notification;
import com.example.gov_scheme_backend.entities.Users;

import java.util.List;

public interface NotificationService {

    List<Notification> getMyNotifications(Users user);

    Notification markAsRead(Long notificationId, Users user);

}