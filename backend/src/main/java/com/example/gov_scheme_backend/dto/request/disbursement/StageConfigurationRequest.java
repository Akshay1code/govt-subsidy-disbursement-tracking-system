package com.example.gov_scheme_backend.dto.request.disbursement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StageConfigurationRequest {
    private List<StageDto> stages;
}
