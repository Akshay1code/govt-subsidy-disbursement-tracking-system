package com.example.gov_scheme_backend.dto.response.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfficerWorkloadDTO {
    private Long officerId;
    private String officerName;
    private String role;
    private long allocatedCount;
    private int capacity;
    private int remainingCapacity;
}
