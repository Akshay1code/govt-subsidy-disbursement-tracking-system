package com.example.gov_scheme_backend.entities;

import com.example.gov_scheme_backend.enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "field_inspections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "officer_id", nullable = false)
    private Users officer;

    @Column(name = "address_verified", nullable = false)
    private Boolean addressVerified = false;

    @Column(name = "business_activity_confirmed", nullable = false)
    private Boolean businessActivityConfirmed = false;

    @Column(name = "assets_inspected", nullable = false)
    private Boolean assetsInspected = false;

    @Column(name = "notes", length = 2000)
    private String notes;

    @ElementCollection
    @CollectionTable(name = "inspection_media_ids", joinColumns = @JoinColumn(name = "inspection_id"))
    @Column(name = "media_id")
    private List<String> evidenceMediaIds;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;
}
