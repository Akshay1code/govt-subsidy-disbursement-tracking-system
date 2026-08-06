package com.example.gov_scheme_backend.disbursement.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "scheme")
public class Scheme {
    @Id
    private Long id;
    private Long budgetUsed;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBudgetUsed() { return budgetUsed; }
    public void setBudgetUsed(Long budgetUsed) { this.budgetUsed = budgetUsed; }
}
