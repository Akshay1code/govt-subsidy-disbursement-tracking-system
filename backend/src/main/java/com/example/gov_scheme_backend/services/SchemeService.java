package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.SchemesDto;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.gov_scheme_backend.entities.SchemeCategory;
import com.example.gov_scheme_backend.repositories.SchemeCategoryRepository;

import java.util.UUID;

@Service
public class SchemeService {
    @Autowired
    SchemeRepo schemeRepo;
    @Autowired
    SchemeCategoryRepository schemeCategoryRepository;

    public ApiResponse addService(SchemesDto req) {

        if (req == null ||
                req.getSchemeName() == null ||
                req.getDescription() == null ||
                req.getCategoryId() == null) {

            return new ApiResponse(false, "Required fields are missing");
        }

        if (req.getAllocatedFunds() == null || req.getAllocatedFunds() <= 0) {
            return new ApiResponse(false, "Allocated funds must be greater than zero");
        }

        SchemeCategory category = schemeCategoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Schemes scheme = new Schemes();

        // Use the code sent by admin, otherwise generate one
        if (req.getSchemeCode() == null || req.getSchemeCode().isBlank()) {
            scheme.setSchemeCode("SCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        } else {
            scheme.setSchemeCode(req.getSchemeCode());
        }
        scheme.setSchemeName(req.getSchemeName());
        scheme.setDescription(req.getDescription());
        scheme.setAllocatedFunds(req.getAllocatedFunds());
        scheme.setMinimumEligibleScore(req.getMinimumEligibleScore());
        scheme.setActive(req.getActive() == null ? true : req.getActive());
        scheme.setCategory(category);
        schemeRepo.save(scheme);
        return new ApiResponse(true, "Scheme created successfully");
    }
}