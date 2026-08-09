package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.RuleField;
import com.example.gov_scheme_backend.enums.RuleKey;
import com.example.gov_scheme_backend.enums.RuleOperator;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Optional;

@Entity
@Table(name = "scheme_eligibility_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeEligibilityRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_code", referencedColumnName = "scheme_code", nullable = false)
    private Schemes scheme;
    @Enumerated(EnumType.STRING)
    @Column
    RuleField fieldName;
    @Column
    String expectedValue;
    @Column
    int points;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RuleKey ruleKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RuleOperator operator;

    @Column(nullable = false)
    private String ruleValue;

    @Column(nullable = false)
    private Double tolerance;

    @Column(nullable = false)
    private Double partialPercentage;

}
