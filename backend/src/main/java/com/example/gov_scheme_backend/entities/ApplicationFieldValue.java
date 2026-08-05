package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.RuleField;
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
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RuleField fieldName;

    @Column(nullable = false)
    private String fieldValue;
}