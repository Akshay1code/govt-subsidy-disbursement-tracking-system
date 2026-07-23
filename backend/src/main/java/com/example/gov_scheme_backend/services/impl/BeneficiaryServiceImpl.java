package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.BeneficiaryResponseDTO;
import com.example.gov_scheme_backend.enums.BeneficiaryStatus;
import com.example.gov_scheme_backend.entities.Beneficiary;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.BeneficiaryRepository;
import com.example.gov_scheme_backend.services.BeneficiaryService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BeneficiaryServiceImpl implements BeneficiaryService {
    private static final String BENEFICIARY_ID_PREFIX = "BEN";

    private final BeneficiaryRepository beneficiaryRepository;

    /** Registers a beneficiary and creates the public beneficiary ID in BEN000001 format. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO registerBeneficiary(BeneficiaryRequestDTO request) {
        validateDuplicateAadhaar(request.getAadhaarNumber());
        validateDuplicateMobile(request.getMobileNumber());

        Beneficiary beneficiary = new Beneficiary();
        mapRequestToEntity(request, beneficiary);
        beneficiary.setStatus(BeneficiaryStatus.ACTIVE);

        Beneficiary savedBeneficiary = beneficiaryRepository.save(beneficiary);
        savedBeneficiary.setBeneficiaryId(generateBeneficiaryId(savedBeneficiary.getId()));

        return mapToResponse(beneficiaryRepository.save(savedBeneficiary));
    }

    /** Returns a single active beneficiary. */
    @Override
    public BeneficiaryResponseDTO getBeneficiary(Long id) {
        return mapToResponse(getActiveBeneficiary(id));
    }

    /** Returns all beneficiaries that are not soft deleted. */
    @Override
    public List<BeneficiaryResponseDTO> getAllBeneficiaries() {
        return beneficiaryRepository.findByStatus(BeneficiaryStatus.ACTIVE)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /** Updates beneficiary details while preserving duplicate Aadhaar and mobile constraints. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO updateBeneficiary(Long id, BeneficiaryRequestDTO request) {
        Beneficiary beneficiary = getActiveBeneficiary(id);

        if (beneficiaryRepository.existsByAadhaarNumberAndIdNot(request.getAadhaarNumber(), id)) {
            throw new DuplicateResourceException("Aadhaar number already exists");
        }
        if (beneficiaryRepository.existsByMobileNumberAndIdNot(request.getMobileNumber(), id)) {
            throw new DuplicateResourceException("Mobile number already exists");
        }

        mapRequestToEntity(request, beneficiary);
        return mapToResponse(beneficiaryRepository.save(beneficiary));
    }

    /** Soft deletes a beneficiary by marking status as inactive. */
    @Override
    @Transactional
    public void deleteBeneficiary(Long id) {
        Beneficiary beneficiary = getActiveBeneficiary(id);
        beneficiary.setStatus(BeneficiaryStatus.INACTIVE);
        beneficiaryRepository.save(beneficiary);
    }

    /** Searches by exact-ish numeric fragments and name fragments across active records. */
    @Override
    public List<BeneficiaryResponseDTO> searchBeneficiary(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            throw new BadRequestException("Search keyword is required");
        }

        String searchText = keyword.trim();
        Map<Long, Beneficiary> uniqueResults = new LinkedHashMap<>();
        addResults(uniqueResults, beneficiaryRepository.findByAadhaarNumberContainingAndStatus(searchText, BeneficiaryStatus.ACTIVE));
        addResults(uniqueResults, beneficiaryRepository.findByMobileNumberContainingAndStatus(searchText, BeneficiaryStatus.ACTIVE));
        addResults(uniqueResults, beneficiaryRepository.findByFullNameContainingIgnoreCaseAndStatus(searchText, BeneficiaryStatus.ACTIVE));

        return uniqueResults.values()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Beneficiary getActiveBeneficiary(Long id) {
        return beneficiaryRepository.findByIdAndStatus(id, BeneficiaryStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with id: " + id));
    }

    private void validateDuplicateAadhaar(String aadhaarNumber) {
        if (beneficiaryRepository.existsByAadhaarNumber(aadhaarNumber)) {
            throw new DuplicateResourceException("Aadhaar number already exists");
        }
    }

    private void validateDuplicateMobile(String mobileNumber) {
        if (beneficiaryRepository.existsByMobileNumber(mobileNumber)) {
            throw new DuplicateResourceException("Mobile number already exists");
        }
    }

    private String generateBeneficiaryId(Long id) {
        return BENEFICIARY_ID_PREFIX + String.format("%06d", id);
    }

    private void mapRequestToEntity(BeneficiaryRequestDTO request, Beneficiary beneficiary) {
        beneficiary.setFullName(request.getFullName());
        beneficiary.setAadhaarNumber(request.getAadhaarNumber());
        beneficiary.setDateOfBirth(request.getDateOfBirth());
        beneficiary.setGender(request.getGender());
        beneficiary.setMobileNumber(request.getMobileNumber());
        beneficiary.setEmail(request.getEmail());
        beneficiary.setFatherName(request.getFatherName());
        beneficiary.setOccupation(request.getOccupation());
        beneficiary.setAnnualIncome(request.getAnnualIncome());
        beneficiary.setCategory(request.getCategory());
        beneficiary.setAddress(request.getAddress());
        beneficiary.setVillage(request.getVillage());
        beneficiary.setMandal(request.getMandal());
        beneficiary.setDistrict(request.getDistrict());
        beneficiary.setState(request.getState());
        beneficiary.setPincode(request.getPincode());
        beneficiary.setBankAccountNumber(request.getBankAccountNumber());
        beneficiary.setIfscCode(request.getIfscCode());
        beneficiary.setBankName(request.getBankName());
        beneficiary.setLandArea(request.getLandArea());
        beneficiary.setLandSurveyNumber(request.getLandSurveyNumber());
    }

    private BeneficiaryResponseDTO mapToResponse(Beneficiary beneficiary) {
        return BeneficiaryResponseDTO.builder()
                .id(beneficiary.getId())
                .beneficiaryId(beneficiary.getBeneficiaryId())
                .fullName(beneficiary.getFullName())
                .aadhaarNumber(beneficiary.getAadhaarNumber())
                .dateOfBirth(beneficiary.getDateOfBirth())
                .gender(beneficiary.getGender())
                .mobileNumber(beneficiary.getMobileNumber())
                .email(beneficiary.getEmail())
                .fatherName(beneficiary.getFatherName())
                .occupation(beneficiary.getOccupation())
                .annualIncome(beneficiary.getAnnualIncome())
                .category(beneficiary.getCategory())
                .address(beneficiary.getAddress())
                .village(beneficiary.getVillage())
                .mandal(beneficiary.getMandal())
                .district(beneficiary.getDistrict())
                .state(beneficiary.getState())
                .pincode(beneficiary.getPincode())
                .bankAccountNumber(beneficiary.getBankAccountNumber())
                .ifscCode(beneficiary.getIfscCode())
                .bankName(beneficiary.getBankName())
                .landArea(beneficiary.getLandArea())
                .landSurveyNumber(beneficiary.getLandSurveyNumber())
                .status(beneficiary.getStatus())
                .createdAt(beneficiary.getCreatedAt())
                .updatedAt(beneficiary.getUpdatedAt())
                .build();
    }

    private void addResults(Map<Long, Beneficiary> uniqueResults, List<Beneficiary> beneficiaries) {
        beneficiaries.forEach(beneficiary -> uniqueResults.putIfAbsent(beneficiary.getId(), beneficiary));
    }
}
