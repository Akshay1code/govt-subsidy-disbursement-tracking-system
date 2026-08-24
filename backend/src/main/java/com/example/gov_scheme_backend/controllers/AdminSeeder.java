package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.repositories.UserRepo;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    public AdminSeeder(UserRepo userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        if (userRepo.existsByUsername("admin_123")) {
            return;
        }

        Users admin = new Users();

        admin.setFullName("Super Admin");
        admin.setUsername("admin_123");
        admin.setPassword(passwordEncoder.encode("Admin@123"));
        admin.setRole(Role.ADMIN);

        userRepo.save(admin);

        System.out.println("✅ Default admin created.");
    }
}