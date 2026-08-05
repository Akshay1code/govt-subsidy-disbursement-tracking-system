package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "scheme_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String categoryName;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active = true;
}