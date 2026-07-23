package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApplicationResponseDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepository;
import com.example.gov_scheme_backend.repositories.BeneficiaryRepository;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.services.ApplicationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final SchemeRepo schemeRepo;

    @Override
    @Transactional
    public ApplicationResponseDTO submitApplication(ApplicationRequestDTO request) {

        validateBeneficiary(request.getBeneficiaryId());

        validateScheme(request.getSchemeId());

        validateDuplicateApplication(
                request.getBeneficiaryId(),
                request.getSchemeId()
        );

        Application application = mapRequestToEntity(request);

        application.setStatus(ApplicationStatus.PENDING);

        Application saved = applicationRepository.save(application);

        saved.setApplicationCode(generateApplicationCode(saved.getId()));

        saved = applicationRepository.save(saved);

        return mapToResponse(saved);
    }

    private void validateBeneficiary(Long beneficiaryId) {

        beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Beneficiary not found with id: " + beneficiaryId
                        )
                );
    }

    private Schemes validateScheme(Integer schemeId) {

        Schemes scheme = schemeRepo.findById(schemeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Scheme not found with id: " + schemeId
                        )
                );

        if (!scheme.getActive()) {
            throw new BadRequestException(
                    "Selected scheme is currently inactive"
            );
        }

        return scheme;
    }

    private void validateDuplicateApplication(Long beneficiaryId,
                                              Integer schemeId) {

        if (applicationRepository.existsByBeneficiaryIdAndSchemeId(
                beneficiaryId,
                schemeId)) {

            throw new DuplicateResourceException(
                    "Beneficiary has already applied for this scheme"
            );
        }
    }

    private Application mapRequestToEntity(ApplicationRequestDTO request) {

        Application application = new Application();

        application.setBeneficiaryId(request.getBeneficiaryId());
        application.setSchemeId(request.getSchemeId());
        application.setRemarks(request.getRemarks());

        return application;
    }

    private String generateApplicationCode(Long id) {
        return "APP" + String.format("%06d", id);
    }

    private ApplicationResponseDTO mapToResponse(Application application) {

        ApplicationResponseDTO response = new ApplicationResponseDTO();

        response.setApplicationId(application.getId());
        response.setApplicationCode(application.getApplicationCode());
        response.setBeneficiaryId(application.getBeneficiaryId());
        response.setSchemeId(application.getSchemeId());
        response.setStatus(application.getStatus());
        response.setRemarks(application.getRemarks());
        response.setCreatedAt(application.getCreatedAt());

        return response;
    }
}