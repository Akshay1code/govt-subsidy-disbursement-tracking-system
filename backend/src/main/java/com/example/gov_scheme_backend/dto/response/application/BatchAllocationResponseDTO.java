package com.example.gov_scheme_backend.dto.response.application;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BatchAllocationResponseDTO {
    private int requestedCount;
    private int allocatedCount;
    private String message;
}
