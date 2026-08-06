package com.example.gov_scheme_backend.dto.request.disbursement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StageDto {
    private Integer stageNumber;
    private String milestoneName;
    private Double amountToRelease;
    private LocalDate dueDate;
}
