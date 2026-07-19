package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name="application_field_values")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="application_id", nullable = false)
    private Application application;


    @Column(nullable = false)
    private String fieldName;


    @Column(nullable = false)
    private String fieldValue;
}