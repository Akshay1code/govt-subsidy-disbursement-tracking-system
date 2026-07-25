package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeRequiredFieldRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeRequiredFieldResponseDTO;
import com.example.gov_scheme_backend.services.SchemeRequiredFieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scheme-fields")
@RequiredArgsConstructor
public class SchemeRequiredFieldController {

    private final SchemeRequiredFieldService service;

    @PostMapping
    public SchemeRequiredFieldResponseDTO addField(
            @RequestBody SchemeRequiredFieldRequestDTO request) {

        return service.addField(request);
    }

    @GetMapping("/scheme/{schemeId}")
    public List<SchemeRequiredFieldResponseDTO> getFields(
            @PathVariable Integer schemeId) {

        return service.getFieldsByScheme(schemeId);
    }

    @DeleteMapping("/{id}")
    public String deleteField(@PathVariable Long id) {

        service.deleteField(id);

        return "Field removed successfully";
    }
}