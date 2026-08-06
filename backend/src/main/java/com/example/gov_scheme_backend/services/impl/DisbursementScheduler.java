package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.services.DisbursementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DisbursementScheduler {

    @Autowired
    private DisbursementService disbursementService;

    // Daily reminder scheduler - runs every morning at 9 AM
    @Scheduled(cron = "0 0 9 * * *")
    public void sendUpcomingReminders() {
        disbursementService.sendUpcomingReminders();
    }

    // Daily overdue scheduler - runs every morning at 10 AM
    @Scheduled(cron = "0 0 10 * * *")
    public void flagOverdueMilestones() {
        disbursementService.flagOverdueMilestones();
    }
}
