package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.SchemeCategoryRequestDTO;
import com.example.gov_scheme_backend.dto.response.SchemeCategoryResponseDTO;
import com.example.gov_scheme_backend.entities.SchemeCategory;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.SchemeCategoryRepository;
import com.example.gov_scheme_backend.services.SchemeCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchemeCategoryServiceImpl implements SchemeCategoryService {

    private final SchemeCategoryRepository schemeCategoryRepository;

    @Override
    public SchemeCategoryResponseDTO createCategory(SchemeCategoryRequestDTO request) {

        if (schemeCategoryRepository.existsByCategoryNameIgnoreCase(request.getCategoryName())) {
            throw new DuplicateResourceException("Category already exists");
        }

        SchemeCategory category = new SchemeCategory();

        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setActive(true);

        SchemeCategory saved = schemeCategoryRepository.save(category);

        return mapToResponse(saved);
    }

    @Override
    public List<SchemeCategoryResponseDTO> getAllCategories() {

        return schemeCategoryRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public SchemeCategoryResponseDTO getCategory(Integer id) {

        SchemeCategory category = schemeCategoryRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found"));

        return mapToResponse(category);
    }

    @Override
    public SchemeCategoryResponseDTO updateCategory(Integer id,
                                                    SchemeCategoryRequestDTO request) {

        SchemeCategory category = schemeCategoryRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found"));

        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());

        return mapToResponse(schemeCategoryRepository.save(category));
    }

    @Override
    public void deleteCategory(Integer id) {

        SchemeCategory category = schemeCategoryRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found"));

        category.setActive(false);

        schemeCategoryRepository.save(category);
    }

    private SchemeCategoryResponseDTO mapToResponse(SchemeCategory category) {

        SchemeCategoryResponseDTO response = new SchemeCategoryResponseDTO();

        response.setId(category.getId());
        response.setCategoryName(category.getCategoryName());
        response.setDescription(category.getDescription());
        response.setActive(category.isActive());

        return response;
    }
}