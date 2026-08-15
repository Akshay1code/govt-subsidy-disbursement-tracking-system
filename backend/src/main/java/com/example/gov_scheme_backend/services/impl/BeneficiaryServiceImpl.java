package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.beneficiary.BeneficiaryRequestDTO;
import com.example.gov_scheme_backend.dto.response.beneficiary.BeneficiaryResponseDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Beneficiary;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.BeneficiaryRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.BeneficiaryService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepo beneficiaryRepo;
    private final UserRepo usersRepo;
    private final ApplicationRepo applicationRepo;
    private final com.example.gov_scheme_backend.repositories.AuditLogRepo auditLogRepo;

    /** Creates a beneficiary record linked to a user and their approved application. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO registerBeneficiary(BeneficiaryRequestDTO request) {
        if (beneficiaryRepo.existsByApplication_Id(request.getApplicationId())) {
            throw new DuplicateResourceException("Beneficiary already exists for this application");
        }

        Users user = usersRepo.findByuniqueID(request.getUniqueID())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUniqueID()));

        Application application = applicationRepo.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + request.getApplicationId()));

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setUser(user);
        beneficiary.setApplication(application);
        beneficiary.setSanctionedAmount(request.getSanctionedAmount());
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
        beneficiary.setApprovedDate(request.getApprovedDate());
        beneficiary.setDisbursedDate(request.getDisbursedDate());
        beneficiary.setRemarks(request.getRemarks());
        beneficiary.setIsFlagged(false);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.CREATE)
                .description("Registered beneficiary for Application ID: " + request.getApplicationId())
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    @Override
    public BeneficiaryResponseDTO getBeneficiary(Long id) {
        return mapToResponse(getExistingBeneficiary(id));
    }

    @Override
    public List<BeneficiaryResponseDTO> getAllBeneficiaries() {
        return beneficiaryRepo.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /** Updates editable fields (amounts, dates, remarks). */
    @Transactional
    public BeneficiaryResponseDTO updateBeneficiary(Long id, BeneficiaryRequestDTO request) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setSanctionedAmount(request.getSanctionedAmount());
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
        beneficiary.setApprovedDate(request.getApprovedDate());
        beneficiary.setDisbursedDate(request.getDisbursedDate());
        beneficiary.setRemarks(request.getRemarks());

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Updated beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Marks a beneficiary as flagged with a mandatory reason (e.g. document mismatch, fraud suspicion). */
    @Override
    @Transactional
    public BeneficiaryResponseDTO flagBeneficiary(Long id, String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Flag reason is required");
        }

        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setIsFlagged(true);
        beneficiary.setFlagReason(reason);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Flagged beneficiary ID: " + id + " with reason: " + reason)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Clears the flag from a beneficiary once reviewed. */
    @Override
    @Transactional
    public BeneficiaryResponseDTO unflagBeneficiary(Long id) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiary.setIsFlagged(false);
        beneficiary.setFlagReason(null);

        Beneficiary saved = beneficiaryRepo.save(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.UPDATE)
                .description("Unflagged beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);

        return mapToResponse(saved);
    }

    /** Deletes a beneficiary record. */
    @Override
    @Transactional
    public void deleteBeneficiary(Long id) {
        Beneficiary beneficiary = getExistingBeneficiary(id);
        beneficiaryRepo.delete(beneficiary);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.DELETE)
                .description("Deleted beneficiary ID: " + id)
                .build();
        auditLogRepo.save(audit);
    }

    @Override
    @Transactional
    public BeneficiaryResponseDTO disburseBeneficiary(Long id, com.example.gov_scheme_backend.dto.request.schemes.DisbursementRequestDTO request) {
        Beneficiary beneficiary = getExistingBeneficiary(id);

        if (Boolean.TRUE.equals(beneficiary.getIsFlagged())) {
            throw new BadRequestException("Beneficiary is flagged for review and cannot be disbursed");
        }

        // set disbursement details
        beneficiary.setDisbursedAmount(request.getDisbursedAmount());
               if (request.getRemarks() != null) {
            beneficiary.setRemarks(request.getRemarks());
        }
        // mark beneficiary active (business choice)
        beneficiary.setCurrentStatus(com.example.gov_scheme_backend.enums.BeneficiaryStatus.ACTIVE);

        beneficiary = beneficiaryRepo.save(beneficiary);

        // Update application status to DISBURSED
        Application application = beneficiary.getApplication();
        application.setStatus(com.example.gov_scheme_backend.enums.ApplicationStatus.DISBURSED);
        applicationRepo.save(application);

        // Write audit log
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.example.gov_scheme_backend.entities.Users performer = null;
        if (username != null) {
            performer = usersRepo.findByUsername(username).orElse(null);
        }

        com.example.gov_scheme_backend.entities.AuditLog audit = com.example.gov_scheme_backend.entities.AuditLog.builder()
                .auditId(java.util.UUID.randomUUID().toString())
                .user(performer)
                .action(com.example.gov_scheme_backend.enums.AuditAction.DISBURSE)
                .description("Disbursed amount " + request.getDisbursedAmount() + " to beneficiary id " + id + (performer != null ? " by " + performer.getUsername() : ""))
                .build();

        auditLogRepo.save(audit);

        return mapToResponse(beneficiary);
    }

    private Beneficiary getExistingBeneficiary(Long id) {
        return beneficiaryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with id: " + id));
    }

    private BeneficiaryResponseDTO mapToResponse(Beneficiary beneficiary) {
        return BeneficiaryResponseDTO.builder()
                .id(beneficiary.getId())
                .uniqueID(beneficiary.getUser().getUniqueID())
                .applicationId(beneficiary.getApplication().getId())
                .sanctionedAmount(beneficiary.getSanctionedAmount())
                .disbursedAmount(beneficiary.getDisbursedAmount())
                .currentStatus(beneficiary.getCurrentStatus())
                .approvedDate(beneficiary.getApprovedDate())
                .disbursedDate(beneficiary.getDisbursedDate())
                .remarks(beneficiary.getRemarks())
                .isFlagged(beneficiary.getIsFlagged())
                .flagReason(beneficiary.getFlagReason())
                .build();
    }
}