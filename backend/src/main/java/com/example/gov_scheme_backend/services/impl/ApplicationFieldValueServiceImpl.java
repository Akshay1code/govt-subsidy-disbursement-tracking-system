package com.example.gov_scheme_backend.services.impl;

import com.example.gov_scheme_backend.dto.request.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApplicationFieldValueResponseDTO;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.ApplicationFieldValue;
import com.example.gov_scheme_backend.repositories.ApplicationFieldValueRepository;
import com.example.gov_scheme_backend.repositories.ApplicationRepository;
import com.example.gov_scheme_backend.services.ApplicationFieldValueService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApplicationFieldValueServiceImpl
        implements ApplicationFieldValueService {


    private final ApplicationFieldValueRepository fieldRepository;

    private final ApplicationRepository applicationRepository;


    @Override
    public List<ApplicationFieldValueResponseDTO> saveFields(
            Long applicationId,
            List<ApplicationFieldValueRequestDTO> requests) {


        Application application =
                applicationRepository.findById(applicationId)
                        .orElseThrow(() ->
                                new RuntimeException("Application not found"));


        List<ApplicationFieldValue> values =
                requests.stream()
                        .map(req -> {

                            ApplicationFieldValue field =
                                    new ApplicationFieldValue();

                            field.setApplication(application);
                            field.setFieldName(req.getFieldName());
                            field.setFieldValue(req.getFieldValue());

                            return field;

                        })
                        .toList();


        return fieldRepository.saveAll(values)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }



    @Override
    public List<ApplicationFieldValueResponseDTO> getFields(
            Long applicationId) {


        return fieldRepository.findByApplicationId(applicationId)
                .stream()
                .map(this::mapToResponse)
                .toList();

    }



    private ApplicationFieldValueResponseDTO mapToResponse(
            ApplicationFieldValue field) {


        ApplicationFieldValueResponseDTO response =
                new ApplicationFieldValueResponseDTO();


        response.setId(field.getId());

        response.setApplicationId(
                field.getApplication().getId()
        );

        response.setFieldName(
                field.getFieldName()
        );

        response.setFieldValue(
                field.getFieldValue()
        );


        return response;
    }
}