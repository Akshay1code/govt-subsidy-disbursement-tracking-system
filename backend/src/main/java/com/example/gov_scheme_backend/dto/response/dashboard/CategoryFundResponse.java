package com.example.gov_scheme_backend.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryFundResponse {
    private String category;
    private Double sanctioned;
    private Double disbursed;
    private Double remaining;
}
