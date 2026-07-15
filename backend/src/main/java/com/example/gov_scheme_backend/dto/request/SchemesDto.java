package com.example.gov_scheme_backend.dto.request;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SchemesDto {
    String schemeName;
    String description;
    double allocatedFunds;
}
