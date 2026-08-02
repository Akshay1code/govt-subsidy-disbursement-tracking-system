package com.example.gov_scheme_backend.dto.response.schemes;

import lombok.Data;

@Data
public class SchemeCategoryResponseDTO {

    private Integer id;

    private String categoryName;

    private String description;

    private boolean active;
}