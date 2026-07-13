package com.example.gov_scheme_backend.models;

import com.example.gov_scheme_backend.enums.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    @Column
    String fullName;
    @Column(unique = true)
    String username;
    @Column(unique = false)
    String password;
    @Column
    @Enumerated(EnumType.STRING)
    Role role;
    @Column(length = 10)
    String mobileNo;
    @CreationTimestamp
    LocalDateTime createdAt;
    @CreationTimestamp
    LocalDateTime updatedAt;
}
