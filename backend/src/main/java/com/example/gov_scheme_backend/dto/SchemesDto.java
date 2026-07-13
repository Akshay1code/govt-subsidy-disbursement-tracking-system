package com.example.gov_scheme_backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SchemesDto {
    String schemeName;
    String description;
    double allocatedFunds;
}
