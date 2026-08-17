package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.beneficiary.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.response.beneficiary.BeneficiaryResponseDTO;
import com.example.gov_scheme_backend.services.BeneficiaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/gov/beneficiary")
@RequiredArgsConstructor
public class BeneficiaryController {
    private final BeneficiaryService beneficiaryService;

    /** Registers a beneficiary record (normally auto-triggered when an application clears final approval). */
    @PostMapping("/add")
    public ResponseEntity<BeneficiaryResponseDTO> registerBeneficiary(@Valid @RequestBody BeneficiaryRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(beneficiaryService.registerBeneficiary(request));
    }

    /** Returns all beneficiaries. */
    @GetMapping("/get")
    public ResponseEntity<List<BeneficiaryResponseDTO>> getAllBeneficiaries() {
        return ResponseEntity.ok(beneficiaryService.getAllBeneficiaries());
    }

    /** Returns the beneficiary row for the currently authenticated user. */
    @GetMapping("/me")
    public ResponseEntity<BeneficiaryResponseDTO> getCurrentBeneficiary() {
        return ResponseEntity.ok(beneficiaryService.getCurrentBeneficiary());
    }

    /** Updates editable beneficiary fields (amounts, dates, remarks). */
    @PutMapping("/{id}")
    public ResponseEntity<BeneficiaryResponseDTO> updateBeneficiary(
            @PathVariable Long id,
            @Valid @RequestBody BeneficiaryRequestDTO request) {
        return ResponseEntity.ok(beneficiaryService.updateBeneficiary(id, request));
    }

    /** Finance officer endpoint: mark beneficiary as disbursed. */
    @PostMapping("/{id}/disburse")
    public ResponseEntity<BeneficiaryResponseDTO> disburseBeneficiary(
            @PathVariable Long id,
            @Valid @RequestBody com.example.gov_scheme_backend.dto.request.schemes.DisbursementRequestDTO request) {
        return ResponseEntity.ok(beneficiaryService.disburseBeneficiary(id, request));
    }

    /** Flags a beneficiary for review with a mandatory reason. */
    @PutMapping("/{id}/flag")
    public ResponseEntity<BeneficiaryResponseDTO> flagBeneficiary(
            @PathVariable Long id,
            @RequestParam String reason) {
        return ResponseEntity.ok(beneficiaryService.flagBeneficiary(id, reason));
    }

    /** Clears the flag on a beneficiary once reviewed. */
    @PutMapping("/{id}/unflag")
    public ResponseEntity<BeneficiaryResponseDTO> unflagBeneficiary(@PathVariable Long id) {
        return ResponseEntity.ok(beneficiaryService.unflagBeneficiary(id));
    }

    /** Deletes a beneficiary record. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBeneficiary(@PathVariable Long id) {
        beneficiaryService.deleteBeneficiary(id);
        return ResponseEntity.ok().build();
    }
}
