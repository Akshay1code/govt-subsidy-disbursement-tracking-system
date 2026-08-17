package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;
import com.example.gov_scheme_backend.enums.DocumentType;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ApplicationService {

    EligibilityEngineScoreDTO saveFields(
            Long userId,
            ApplicationFieldValueRequestDTO requests
    );

    void cancelApplication(
            Long userId,
            Long applicationId
    );

    void submitApplication(
            Long userId,
            String schemeCode
    );

    /**
     * Uploads one or more documents to Cloudinary and persists the returned
     * {@code secure_url} in the {@code ApplicationDocument.documentUrl} column.
     *
     * @param userId        the authenticated user's ID
     * @param schemeCode    identifies the application (user + scheme must exist)
     * @param files         the list of multipart files to upload
     * @param documentTypes the document type for each file (must match files list size)
     */
    void uploadDocuments(
            Long userId,
            String schemeCode,
            List<MultipartFile> files,
            List<DocumentType> documentTypes
    );

}
