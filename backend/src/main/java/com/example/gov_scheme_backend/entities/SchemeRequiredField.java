package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.ApplicationField;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "scheme_required_fields")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeRequiredField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_code", referencedColumnName = "scheme_code", nullable = false)
    private Schemes scheme;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationField fieldName;

    @Column(nullable = false)
    private Boolean mandatory;
}
