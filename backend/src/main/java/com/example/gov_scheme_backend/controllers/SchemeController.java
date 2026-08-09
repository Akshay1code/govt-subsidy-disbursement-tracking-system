package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.schemes.SchemeCategoryRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.schemes.SchemesDto;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeCategoryResponseDTO;
import com.example.gov_scheme_backend.dto.response.schemes.SchemeResponseDTO;
import com.example.gov_scheme_backend.services.impl.SchemeServiceImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/gov/schemes")

public class SchemeController {

    @Autowired
    SchemeServiceImpl schemeService;

    @PostMapping("/add")
    public ResponseEntity<ApiResponse> addScheme(@RequestBody SchemesDto req){
        ApiResponse res = schemeService.addService(req);
        if(!res.isStatus()){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }

    @PatchMapping("/{schemeCode}")
    public ResponseEntity<ApiResponse> updateScheme(
            @PathVariable String schemeCode,
            @RequestBody SchemesDto req) {
        ApiResponse res = schemeService.updateService(schemeCode, req);
        if (!res.isStatus()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        return ResponseEntity.ok(res);
    }

    @GetMapping("/get")
    public ResponseEntity<List<SchemeResponseDTO>> getAllSchemes() {
        return ResponseEntity.ok(schemeService.getAllSchemes());
    }

    @GetMapping("/get-{categoryName}")
    public ResponseEntity<List<SchemeResponseDTO>> getSchemesByCategory(@PathVariable String categoryName) {
        return ResponseEntity.ok(schemeService.getSchemesByCategory(categoryName));
    }

//    @PostMapping
//    public ResponseEntity<SchemeCategoryResponseDTO> createCategory(
//            @Valid @RequestBody SchemeCategoryRequestDTO request) {
//
//        return ResponseEntity.status(HttpStatus.CREATED)
//                .body(schemeService.createCategory(request));
//    }
//
//    @GetMapping
//    public ResponseEntity<List<SchemeCategoryResponseDTO>> getAllCategories() {
//
//        return ResponseEntity.ok(
//                schemeService.getAllCategories());
//    }
//
//    @GetMapping("/{id}")
//    public ResponseEntity<SchemeCategoryResponseDTO> getCategory(
//            @PathVariable Integer id) {
//
//        return ResponseEntity.ok(
//                schemeService.getCategory(id));
//    }
//
//    @PutMapping("/{id}")
//    public ResponseEntity<SchemeCategoryResponseDTO> updateCategory(
//            @PathVariable Integer id,
//            @Valid @RequestBody SchemeCategoryRequestDTO request) {
//
//        return ResponseEntity.ok(
//                schemeService.updateCategory(id, request));
//    }
//
//    @DeleteMapping("/{id}")
//    public ResponseEntity<Void> deleteCategory(
//            @PathVariable Integer id) {
//
//        schemeService.deleteCategory(id);
//
//        return ResponseEntity.ok().build();
//    }
}
