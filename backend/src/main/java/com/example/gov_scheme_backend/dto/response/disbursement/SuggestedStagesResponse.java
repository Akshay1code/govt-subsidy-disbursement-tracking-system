package com.example.gov_scheme_backend.dto.response.disbursement;

import com.example.gov_scheme_backend.dto.request.disbursement.StageDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestedStagesResponse {
    private Long planId;
    private BigDecimal totalAmount;
    private Integer totalStages;
    private List<StageDto> suggestedStages;
}
