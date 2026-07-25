package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.RuleField;
import com.example.gov_scheme_backend.enums.RuleKey;
import com.example.gov_scheme_backend.enums.RuleOperator;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    @JoinColumn(name = "scheme_id", nullable = false)
    private Schemes scheme;
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
}