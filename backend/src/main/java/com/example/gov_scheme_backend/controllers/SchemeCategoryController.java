package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeCategoryRequestDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeCategoryResponseDTO;
import com.example.gov_scheme_backend.services.SchemeCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SchemeCategoryController {

    private final SchemeCategoryService schemeCategoryService;

    @PostMapping
    public ResponseEntity<SchemeCategoryResponseDTO> createCategory(
            @Valid @RequestBody SchemeCategoryRequestDTO request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schemeCategoryService.createCategory(request));
    }

    @GetMapping
    public ResponseEntity<List<SchemeCategoryResponseDTO>> getAllCategories() {

        return ResponseEntity.ok(
                schemeCategoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SchemeCategoryResponseDTO> getCategory(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                schemeCategoryService.getCategory(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SchemeCategoryResponseDTO> updateCategory(
            @PathVariable Integer id,
            @Valid @RequestBody SchemeCategoryRequestDTO request) {

        return ResponseEntity.ok(
                schemeCategoryService.updateCategory(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable Integer id) {

        schemeCategoryService.deleteCategory(id);

        return ResponseEntity.ok().build();
    }
}