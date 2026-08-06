package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.services.DisbursementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/test")
@CrossOrigin(origins = "*")
public class TestController {

    @Autowired
    private DisbursementService disbursementService;

    @Autowired
    private Environment env;

    @PostMapping("/run-overdue-check")
    public ResponseEntity<?> runOverdueCheck() {
        if (isProduction()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed in production environment");
        }
        disbursementService.flagOverdueMilestones();
        return ResponseEntity.ok("Overdue scheduler manually triggered successfully");
    }

    @PostMapping("/run-reminder-check")
    public ResponseEntity<?> runReminderCheck() {
        if (isProduction()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed in production environment");
        }
        disbursementService.sendUpcomingReminders();
        return ResponseEntity.ok("Reminders scheduler manually triggered successfully");
    }

    private boolean isProduction() {
        return Arrays.asList(env.getActiveProfiles()).contains("prod") 
            || Arrays.asList(env.getActiveProfiles()).contains("production");
    }
}
