package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.FieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.ApplicationFieldValue;
import com.example.gov_scheme_backend.entities.Schemes;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.exceptions.DuplicateResourceException;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.repositories.ApplicationRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.repositories.SchemeRepo;
import com.example.gov_scheme_backend.services.ApplicationService;
import com.example.gov_scheme_backend.services.EligibilityEngineService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

        Users user = userRepo.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        Schemes scheme = schemeRepo.findBySchemeCode(req.getSchemeCode())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Scheme not found with code: " + req.getSchemeCode()));

        Application app = new Application();

        app.setApplicationCode("APP-" +
                UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        app.setUser(user);
        app.setScheme(scheme);
        app.setStatus(ApplicationStatus.PENDING);

        List<ApplicationFieldValue> fieldValues = new ArrayList<>();

        for (FieldValueRequestDTO dto : req.getFields()) {

            ApplicationFieldValue field = new ApplicationFieldValue();
            field.setFieldName(dto.getFieldName());
            field.setFieldValue(dto.getValue());
            field.setApplication(app);
            fieldValues.add(field);

        }

        app.setFieldValues(fieldValues);
        applicationRepo.save(app);
        double score = check.validateFields(app.getId());

        if(score < app.getScheme().getMinimumEligibleScore()){
            return new EligibilityEngineScoreDTO(false,score,"You are not eligible");
        }

        return new EligibilityEngineScoreDTO(true,score,"You are eligible");
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