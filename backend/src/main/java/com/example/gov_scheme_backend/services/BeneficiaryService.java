package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.BeneficiaryResponseDTO;

import java.util.List;

public interface BeneficiaryService {
    /** Registers a beneficiary after validating duplicate Aadhaar and mobile number. */
    BeneficiaryResponseDTO registerBeneficiary(BeneficiaryRequestDTO request);

    /** Returns an active beneficiary by database ID. */
    BeneficiaryResponseDTO getBeneficiary(Long id);

    /** Returns all active beneficiaries. */
    List<BeneficiaryResponseDTO> getAllBeneficiaries();

    /** Updates an active beneficiary by database ID. */
    BeneficiaryResponseDTO updateBeneficiary(Long id, BeneficiaryRequestDTO request);

    /** Soft deletes a beneficiary by marking the status as inactive. */
    void deleteBeneficiary(Long id);

    /** Searches active beneficiaries by Aadhaar number, mobile number, or full name. */
    List<BeneficiaryResponseDTO> searchBeneficiary(String keyword);
}
