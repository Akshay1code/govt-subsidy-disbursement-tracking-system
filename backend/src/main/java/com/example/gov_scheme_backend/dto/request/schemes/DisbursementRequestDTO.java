package com.example.gov_scheme_backend.dto.request.schemes;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementRequestDTO {
    double disbursedAmount;
    String remarks;


}
