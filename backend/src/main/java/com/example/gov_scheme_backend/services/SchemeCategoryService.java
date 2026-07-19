package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.SchemeCategoryRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeCategoryResponseDTO;

import java.util.List;

public interface SchemeCategoryService {

    SchemeCategoryResponseDTO createCategory(SchemeCategoryRequestDTO request);

    List<SchemeCategoryResponseDTO> getAllCategories();

    SchemeCategoryResponseDTO getCategory(Integer id);

    SchemeCategoryResponseDTO updateCategory(Integer id,
                                             SchemeCategoryRequestDTO request);

    void deleteCategory(Integer id);
}