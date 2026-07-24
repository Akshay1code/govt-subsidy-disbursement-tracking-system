package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.BeneficiaryResponseDTO;
import com.example.gov_scheme_backend.services.BeneficiaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {
    private final BeneficiaryService beneficiaryService;

    /** Registers a new beneficiary. */
    @PostMapping
    public ResponseEntity<BeneficiaryResponseDTO> registerBeneficiary(@Valid @RequestBody BeneficiaryRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(beneficiaryService.registerBeneficiary(request));
    }

    /** Returns all active beneficiaries. */
    @GetMapping
    public ResponseEntity<List<BeneficiaryResponseDTO>> getAllBeneficiaries() {
        return ResponseEntity.ok(beneficiaryService.getAllBeneficiaries());
    }

    /** Returns an active beneficiary by ID. */
    @GetMapping("/{id}")
    public ResponseEntity<BeneficiaryResponseDTO> getBeneficiary(@PathVariable Long id) {
        return ResponseEntity.ok(beneficiaryService.getBeneficiary(id));
    }

    /** Updates an active beneficiary by ID. */
    @PutMapping("/{id}")
    public ResponseEntity<BeneficiaryResponseDTO> updateBeneficiary(
            @PathVariable Long id,
            @Valid @RequestBody BeneficiaryRequestDTO request) {
        return ResponseEntity.ok(beneficiaryService.updateBeneficiary(id, request));
    }

    /** Soft deletes a beneficiary by ID. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBeneficiary(@PathVariable Long id) {
        beneficiaryService.deleteBeneficiary(id);
        return ResponseEntity.ok().build();
    }

    /** Searches beneficiaries by Aadhaar number, mobile number, or full name. */
    @GetMapping("/search")
    public ResponseEntity<List<BeneficiaryResponseDTO>> searchBeneficiary(@RequestParam String keyword) {
        return ResponseEntity.ok(beneficiaryService.searchBeneficiary(keyword));
    }
}
