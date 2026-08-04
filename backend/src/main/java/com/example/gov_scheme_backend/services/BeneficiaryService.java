package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.beneficiary.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.response.beneficiary.BeneficiaryResponseDTO;

import java.util.List;

public interface BeneficiaryService {

    BeneficiaryResponseDTO registerBeneficiary(BeneficiaryRequestDTO request);

    BeneficiaryResponseDTO getBeneficiary(Long id);

    List<BeneficiaryResponseDTO> getAllBeneficiaries();

    BeneficiaryResponseDTO updateBeneficiary(Long id, BeneficiaryRequestDTO request);

    BeneficiaryResponseDTO flagBeneficiary(Long id, String reason);

    BeneficiaryResponseDTO unflagBeneficiary(Long id);

    void deleteBeneficiary(Long id);

    /**
     * Finance officer marks the beneficiary as disbursed. This updates beneficiary record,
     * links the disbursement to the underlying application (sets Application.status = DISBURSED)
     * and writes an audit log entry.
     */
    BeneficiaryResponseDTO disburseBeneficiary(Long id, com.example.gov_scheme_backend.dto.request.schemes.DisbursementRequestDTO request);
}
