package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.ApplicationSubmitRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.entities.*;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ApplicationSubmitServiceImpl implements ApplicationSubmitService {


    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private SchemeRepo schemeRepo;

    @Autowired
    private ApplicationFieldValueRepository fieldRepository;

    @Autowired
    private ApplicationDocumentRepository documentRepository;


    @Override
    @Transactional
    public ApiResponse submitApplication(ApplicationSubmitRequestDTO request) {


        Schemes scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() ->
                        new RuntimeException("Scheme not found"));


        Application application = new Application();

        application.setApplicationCode(
                "APP-" + UUID.randomUUID()
                        .toString()
                        .substring(0,8)
                        .toUpperCase()
        );

        application.setBeneficiaryId(
                request.getBeneficiaryId()
        );

        application.setSchemeId(
                request.getSchemeId()
        );

        application.setStatus(
                ApplicationStatus.PENDING
        );


        Application savedApplication =
                applicationRepository.save(application);



        // Save Fields

        request.getFields().forEach(field -> {

            ApplicationFieldValue value =
                    new ApplicationFieldValue();

            value.setApplication(savedApplication);
            value.setFieldName(field.getFieldName());
            value.setFieldValue(field.getFieldValue());

            fieldRepository.save(value);

        });



        // Save Documents

        request.getDocuments().forEach(doc -> {


            ApplicationDocument document =
                    new ApplicationDocument();


            document.setApplication(savedApplication);

            document.setDocumentType(
                    doc.getDocumentType()
            );

            document.setFileName(
                    doc.getFileName()
            );

            document.setFilePath(
                    doc.getFilePath()
            );

            documentRepository.save(document);

        });



        return new ApiResponse(
                true,
                "Application submitted successfully"
        );
    }
}