package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.SchemesDto;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SchemeService{
    @Autowired
    SchemeRepo schemeRepo;
    public ApiResponse addService(SchemesDto req){
        if (req == null || req.getSchemeName() == null || req.getDescription() == null) {
            return new ApiResponse(false, "Fields are empty");
        }
        if(req.getAllocatedFunds() <= 0){
            return new ApiResponse(false, "Fund's can't be negative or zero");
        }
        Schemes schemes = new Schemes();

        schemes.setSchemeCode("SCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        schemes.setSchemeName(req.getSchemeName());
        schemes.setDescription(req.getDescription());
        schemes.setAllocatedFunds(req.getAllocatedFunds());
        schemes.setActive(true);
        schemeRepo.save(schemes);
        return new ApiResponse(true, "Scheme created Successfully");
    }
}
