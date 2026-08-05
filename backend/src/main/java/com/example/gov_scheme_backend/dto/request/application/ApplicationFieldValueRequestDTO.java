package com.example.gov_scheme_backend.dto.request.application;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApplicationFieldValueRequestDTO {
    private String schemeCode;
    private List<FieldValueRequestDTO> fields;
}