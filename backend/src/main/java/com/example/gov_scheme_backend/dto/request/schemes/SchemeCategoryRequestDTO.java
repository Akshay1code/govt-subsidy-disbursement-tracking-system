package com.example.gov_scheme_backend.dto.request.schemes;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SchemeCategoryRequestDTO {

    @NotBlank(message = "Category name is required")
    private String categoryName;

    private String description;
}