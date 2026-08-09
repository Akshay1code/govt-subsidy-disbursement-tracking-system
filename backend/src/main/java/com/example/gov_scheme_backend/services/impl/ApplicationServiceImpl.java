package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.FieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.ApplicationDocument;
import com.example.gov_scheme_backend.entities.ApplicationFieldValue;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.ApplicationService;
import com.example.gov_scheme_backend.services.EligibilityEngineService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    @Autowired
    ApplicationRepo applicationRepo;
    @Autowired
    UserRepo userRepo;
    @Autowired
    SchemeRepo schemeRepo;
    @Autowired
    EligibilityEngineService check;

    @Override
    @Transactional
    public EligibilityEngineScoreDTO saveFields(Long userId,
                                  ApplicationFieldValueRequestDTO req) {

        if (req == null || req.getSchemeCode() == null || req.getSchemeCode().trim().isEmpty()) {
            throw new BadRequestException("Scheme code is required");
        }

        Users user = userRepo.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        Schemes scheme = schemeRepo.findBySchemeCode(req.getSchemeCode().trim())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Scheme not found with code: " + req.getSchemeCode()));

        Application app = applicationRepo.findByUser_IdAndScheme_SchemeCode(userId, scheme.getSchemeCode())
                .map(existingApplication -> {
                    if (existingApplication.getStatus() != null
                            && existingApplication.getStatus() != ApplicationStatus.DRAFT
                            && existingApplication.getStatus() != ApplicationStatus.PENDING) {
                        throw new DuplicateResourceException(
                                "An application already exists for this scheme. Please continue or cancel the existing application."
                        );
                    }

                    if (existingApplication.getFieldValues() != null) {
                        existingApplication.getFieldValues().clear();
                    }
                    if (existingApplication.getDocuments() != null) {
                        existingApplication.getDocuments().clear();
                    }

                    existingApplication.setStatus(ApplicationStatus.DRAFT);
                    return existingApplication;
                })
                .orElseGet(() -> {
                    Application newApplication = new Application();
                    newApplication.setApplicationCode("APP-" +
                            UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    newApplication.setUser(user);
                    newApplication.setScheme(scheme);
                    newApplication.setStatus(ApplicationStatus.DRAFT);
                    return newApplication;
                });

        List<FieldValueRequestDTO> submittedFields = req.getFields() == null ? List.of() : req.getFields();
        List<ApplicationFieldValue> fieldValues = new ArrayList<>();

        for (FieldValueRequestDTO dto : submittedFields) {
            if (dto == null || dto.getFieldName() == null) {
                continue;
            }

            ApplicationFieldValue field = new ApplicationFieldValue();
            field.setFieldName(dto.getFieldName());
            field.setFieldValue(dto.getValue());
            field.setApplication(app);
            fieldValues.add(field);

        }

        app.setFieldValues(fieldValues);
        Application saved = applicationRepo.save(app);

        String missingField = findMissingEligibilityField(scheme, submittedFields);
        if (missingField != null) {
            return new EligibilityEngineScoreDTO(false, 0.0, "Missing value for field: " + missingField);
        }

        double score = check.validateFields(saved.getId());

        if(score < scheme.getMinimumEligibleScore()){
            return new EligibilityEngineScoreDTO(false,score,"You are not eligible");
        }

        return new EligibilityEngineScoreDTO(true,score,"You are eligible");
    }

    @Override
    @Transactional
    public void cancelApplication(Long userId, Long applicationId) {
        if (applicationId == null) {
            throw new BadRequestException("Application ID is required");
        }

        Application application = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("No application found for this application ID"));

        if (application.getUser() == null || application.getUser().getId() == null || !application.getUser().getId().equals(userId)) {
            throw new BadRequestException("You are not allowed to cancel this application");
        }

        if (application.getStatus() != ApplicationStatus.DRAFT && application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Only draft applications can be cancelled");
        }

        applicationRepo.delete(application);
    }

    @Override
    @Transactional
    public void submitApplication(Long userId, String schemeCode) {
        if (schemeCode == null || schemeCode.trim().isEmpty()) {
            throw new BadRequestException("Scheme code is required");
        }

        Application application = applicationRepo.findByUser_IdAndScheme_SchemeCode(userId, schemeCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No application found for this scheme"));

        if (application.getStatus() != ApplicationStatus.DRAFT && application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Application has already been submitted");
        }

        application.setStatus(ApplicationStatus.SUBMITTED);
        applicationRepo.save(application);
    }

    private String findMissingEligibilityField(Schemes scheme, List<FieldValueRequestDTO> submittedFields) {
        if (scheme == null || scheme.getEligibilityRules() == null || scheme.getEligibilityRules().isEmpty()) {
            return null;
        }

        Set<String> providedFields = submittedFields.stream()
                .filter(dto -> dto != null && dto.getFieldName() != null)
                .map(dto -> dto.getFieldName().name())
                .collect(Collectors.toSet());

        for (var rule : scheme.getEligibilityRules()) {
            if (rule == null || rule.getFieldName() == null) {
                continue;
            }

            if (!providedFields.contains(rule.getFieldName().name())) {
                return rule.getFieldName().name();
            }
        }

        return null;
    }





//    @Override
//    @Transactional
//    public ApplicationResponseDTO submitApplication(ApplicationRequestDTO request) {
//
//        Users user = validateUser(request.getUserId());
//
//        validateScheme(request.getSchemeId());
//
//        validateDuplicateApplication(
//                request.getUserId(),
//                request.getSchemeId()
//        );
//
//        Application application = mapRequestToEntity(request, user);
//
//        application.setStatus(ApplicationStatus.PENDING);
//
//        Application saved = applicationRepository.save(application);
//
//        saved.setApplicationCode(generateApplicationCode(saved.getId()));
//
//        saved = applicationRepository.save(saved);
//
//        return mapToResponse(saved);
//    }
//
//    private Users validateUser(Long userId) {
//
//        return userRepo.findById(userId)
//                .orElseThrow(() ->
//                        new ResourceNotFoundException(
//                                "User not found with id : " + userId
//                        )
//                );
//    }
//
//    private Schemes validateScheme(Integer schemeId) {
//
//        Schemes scheme = schemeRepo.findById(schemeId)
//                .orElseThrow(() ->
//                        new ResourceNotFoundException(
//                                "Scheme not found with id : " + schemeId
//                        )
//                );
//
//        if (!scheme.getActive()) {
//            throw new BadRequestException(
//                    "Selected scheme is currently inactive"
//            );
//        }
//
//        return scheme;
//    }
//
//    private void validateDuplicateApplication(Long userId,
//                                              Integer schemeId) {
//
//        if (applicationRepo.existsByUserIdAndSchemeId(
//                userId,
//                schemeId)) {
//
//            throw new DuplicateResourceException(
//                    "User has already applied for this scheme"
//            );
//        }
//    }
//
//    private Application mapRequestToEntity(ApplicationRequestDTO request,
//                                           Users user) {
//
//        Application application = new Application();
//
//        application.setUser(user);
//        application.setSchemeId(request.getSchemeId());
//        application.setRemarks(request.getRemarks());
//
//        return application;
//    }
//
//    private String generateApplicationCode(Long id) {
//        return "APP" + String.format("%06d", id);
//    }
//
//    private ApplicationResponseDTO mapToResponse(Application application) {
//
//        ApplicationResponseDTO response = new ApplicationResponseDTO();
//
//        response.setApplicationId(application.getId());
//        response.setApplicationCode(application.getApplicationCode());
//        response.setSchemeId(application.getSchemeId());
//        response.setStatus(application.getStatus());
//        response.setRemarks(application.getRemarks());
//        response.setCreatedAt(application.getCreatedAt());
//
//        return response;
//    }
}
