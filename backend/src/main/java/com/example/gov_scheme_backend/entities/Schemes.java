package com.example.gov_scheme_backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "schemes")
public class Schemes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scheme_code", nullable = false, unique = true)
    private String schemeCode;

    @Column(nullable = false)
    private String schemeName;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double allocatedFunds;

    @Column(name = "budget_used", nullable = false)
    private Double budgetUsed = 0.0;

    public Double getBudgetUsed() {
        return budgetUsed != null ? budgetUsed : 0.0;
    }

    @Column(nullable = false)
    private Double minimumEligibleScore;

    @Column(nullable = false)
    private Boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "category_id",
            nullable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    @NotFound(action = NotFoundAction.IGNORE)
    private SchemeCategory category;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updated;

    @OneToMany(
            mappedBy = "scheme",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<SchemeEligibilityRule> eligibilityRules;

    @OneToMany(
            mappedBy = "scheme",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<SchemeRequiredDocument> requiredDocuments;

    @OneToMany(
            mappedBy = "scheme",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<SchemeRequiredField> requiredFields;

}
