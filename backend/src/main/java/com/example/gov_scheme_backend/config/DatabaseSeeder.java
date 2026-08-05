package com.example.gov_scheme_backend.config;

import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (!userRepo.existsByUsername("finance_officer")) {
            Users financeOfficer = new Users();
            financeOfficer.setUniqueID("OFFI-FINANCE");
            financeOfficer.setFullName("Chief Finance Officer");
            financeOfficer.setUsername("finance_officer");
            financeOfficer.setPassword(passwordEncoder.encode("Password@123"));
            financeOfficer.setMobileNo("9876543210");
            financeOfficer.setRegion("Central Finance");
            financeOfficer.setDistrict("District HQ");
            financeOfficer.setState("State Capital");
            financeOfficer.setRole(Role.FINANCE_OFFICER);
            userRepo.save(financeOfficer);
        }

        if (!userRepo.existsByUsername("admin")) {
            Users admin = new Users();
            admin.setUniqueID("ADMIN-001");
            admin.setFullName("System Admin");
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("Password@123"));
            admin.setMobileNo("9876543211");
            admin.setRegion("Admin Office");
            admin.setDistrict("Nodal HQ");
            admin.setState("State Capital");
            admin.setRole(Role.ADMIN);
            userRepo.save(admin);
        }
    }
}
