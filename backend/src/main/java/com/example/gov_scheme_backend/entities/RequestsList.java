package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.Status;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
public class RequestsList {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    @Column
    String uniqueID;
    @Column
    String fullName;
    @Column
    @Enumerated(EnumType.STRING)
    Role role;
    @Column(length = 10)
    String mobileNo;
    @Column
    String region;
    @Column
    String district;
    @Column
    String state;
    @Column(unique = true)
    String username;
    @Column
    String password;
    @Column
    @Enumerated(EnumType.STRING)
    Status status;
    @CreationTimestamp
    LocalDateTime createdAt;
    @UpdateTimestamp
    LocalDateTime updatedAt;
}
