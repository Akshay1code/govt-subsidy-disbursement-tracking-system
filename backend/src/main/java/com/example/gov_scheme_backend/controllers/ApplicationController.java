package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.ApplicationAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;
import com.example.gov_scheme_backend.enums.DocumentType;
import com.example.gov_scheme_backend.enums.ApplicationStatus;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.security.JwtService;
import com.example.gov_scheme_backend.services.ApplicationService;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.entities.VerificationWorkflow;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/gov/applications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ApplicationController {

    @Autowired
     ApplicationService applicationService;
    @Autowired
    JwtService jwtService;

    @PostMapping("/save-fields")
    public ResponseEntity<?> saveFields(
            @RequestBody ApplicationFieldValueRequestDTO request,
            HttpServletRequest req) {
            String token = jwtService.extractTokenFromCookie(req);
        if(token == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false,"You are Unauthorised"));
        }
        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);
        EligibilityEngineScoreDTO res = applicationService.saveFields(userId,request);
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }

    @PostMapping("/submit/{schemeCode}")
    public ResponseEntity<?> submitApplication(
            @PathVariable String schemeCode,
            HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);
        applicationService.submitApplication(userId, schemeCode);
        return ResponseEntity.ok(new ApiResponse(true, "Application submitted successfully"));
    }

    @DeleteMapping("/{applicationId}")
    public ResponseEntity<?> cancelApplication(
            @PathVariable Long applicationId,
            HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);
        applicationService.cancelApplication(userId, applicationId);
        return ResponseEntity.ok(new ApiResponse(true, "Application process cancelled successfully"));
    }

    /**
     * Uploads one or more documents to Cloudinary and stores the returned
     * {@code secure_url} in the {@code application_documents.document_url} column.
     *
     * <p>This is a multipart/form-data endpoint. Call it after {@code /save-fields}
     * and before {@code /submit/{schemeCode}}.
     *
     * <p>Request parameters:
     * <ul>
     *   <li>{@code files} — one or more document files (PDF / PNG / JPG, max 40 MB each)</li>
     *   <li>{@code types} — document type for each file, e.g. AADHAAR, PAN, INCOME_CERTIFICATE</li>
     * </ul>
     *
     * <p>Valid {@code types} values: AADHAAR, PAN, RATION_CARD, INCOME_CERTIFICATE,
     * CASTE_CERTIFICATE, DOMICILE_CERTIFICATE, LAND_RECORD, BANK_PASSBOOK, PASSPORT,
     * VOTER_ID, DRIVING_LICENSE, DISABILITY_CERTIFICATE, BIRTH_CERTIFICATE,
     * EDUCATION_CERTIFICATE, PASSPORT_PHOTO
     */
    @PostMapping(
            value = "/upload-documents/{schemeCode}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> uploadDocuments(
            @PathVariable String schemeCode,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("types") List<String> types,
            HttpServletRequest req) {

        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        // Parse document types from String -> DocumentType enum with a friendly error
        List<DocumentType> documentTypes;
        try {
            documentTypes = types.stream()
                    .map(t -> DocumentType.valueOf(t.trim().toUpperCase()))
                    .toList();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false,
                            "Invalid document type provided. Allowed values: " +
                            java.util.Arrays.toString(DocumentType.values())));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);

        applicationService.uploadDocuments(userId, schemeCode, files, documentTypes);

        return ResponseEntity.ok(new ApiResponse(true, "Documents uploaded successfully"));
    }

//    @GetMapping("/beneficiary/{applicationId}/get-fields")
//    public List<ApplicationFieldValueResponseDTO> getFields(
//            @PathVariable Long applicationId) {
//
//        return applicationService.getFields(applicationId);
//
//    }
//    @PostMapping("/beneficiary/submit")
//    public ResponseEntity<ApplicationResponseDTO> submitApplication(
//            @Valid @RequestBody ApplicationRequestDTO request) {
//
//        ApplicationResponseDTO response = applicationService.submitApplication(request);
//        return ResponseEntity.status(HttpStatus.CREATED).body(response);
//
//    }

    @Autowired
    private com.example.gov_scheme_backend.repositories.ApplicationRepo applicationRepo;

    @Autowired
    private com.example.gov_scheme_backend.repositories.VerificationWorkflowRepository workflowRepository;

    @Autowired
    private com.example.gov_scheme_backend.repositories.UserRepo userRepo;

    @GetMapping
    public ResponseEntity<?> getAllApplications(HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        return getApplicationsList(new ViewerContext(userId, role));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyApplications(HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Long userId = claims.get("userId", Long.class);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        return getApplicationsList(new ViewerContext(userId, role));
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> getApplicationsList(ViewerContext viewerContext) {
        List<Application> apps;

        if (viewerContext != null && isPrivilegedRole(viewerContext.role())) {
            apps = applicationRepo.findAllByOrderByCreatedAtDesc();
        } else if (viewerContext != null && viewerContext.userId() != null) {
            apps = applicationRepo.findByUser_IdOrderByCreatedAtDesc(viewerContext.userId());
        } else {
            apps = applicationRepo.findAllByOrderByCreatedAtDesc();
        }

        List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Application app : apps) {
            VerificationWorkflow workflow = workflowRepository.findByApplicationId(app.getId()).orElse(null);

            if (viewerContext != null
                    && isOfficerRole(viewerContext.role())
                    && !isAssignedToCurrentOfficer(viewerContext.userId(), workflow)) {
                continue;
            }

            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", app.getId());
            map.put("applicationId", app.getId());
            map.put("applicationCode", app.getApplicationCode());
            map.put("applicant", app.getUser() != null ? app.getUser().getFullName() : "Unknown");
            map.put("applicantName", app.getUser() != null ? app.getUser().getFullName() : "Unknown");
            map.put("schemeName", app.getScheme() != null ? app.getScheme().getSchemeName() : "Unknown");
            map.put("schemeId", app.getScheme() != null ? app.getScheme().getSchemeCode() : "");
            String applicationStatus = app.getStatus() != null ? app.getStatus().toString() : "DRAFT";
            map.put("status", applicationStatus);
            map.put("applicationStatus", applicationStatus);
            map.put("remarks", app.getRemarks());
            map.put("createdAt", app.getCreatedAt());
            map.put("updatedAt", app.getUpdatedAt());
            map.put(
                    "currentStage",
                    workflow != null && workflow.getCurrentStage() != null
                            ? workflow.getCurrentStage().name()
                            : null);
            map.put(
                    "assignedOfficerId",
                    workflow != null && workflow.getAssignedOfficer() != null
                            ? workflow.getAssignedOfficer().getUniqueID()
                            : null);
            map.put(
                    "assignedOfficerDbId",
                    workflow != null && workflow.getAssignedOfficer() != null
                            ? workflow.getAssignedOfficer().getId()
                            : null);
            map.put(
                    "assignedOfficerName",
                    workflow != null && workflow.getAssignedOfficer() != null
                            ? workflow.getAssignedOfficer().getFullName()
                            : null);
            map.put(
                    "submittedDate",
                    "DRAFT".equalsIgnoreCase(applicationStatus) || "PENDING".equalsIgnoreCase(applicationStatus)
                            ? app.getCreatedAt()
                            : (app.getUpdatedAt() != null ? app.getUpdatedAt() : app.getCreatedAt()));

            String annualIncome = null;
            String aadhaar = null;
            String phone = app.getUser() != null ? app.getUser().getMobileNo() : null;
            String district = app.getUser() != null ? app.getUser().getDistrict() : null;
            String state = app.getUser() != null ? app.getUser().getState() : null;

            java.util.Map<String, String> fields = new java.util.HashMap<>();
            if (app.getFieldValues() != null) {
                for (com.example.gov_scheme_backend.entities.ApplicationFieldValue val : app.getFieldValues()) {
                    String fieldNameStr = val.getFieldName() != null ? val.getFieldName().name() : "";
                    fields.put(fieldNameStr, val.getFieldValue());
                    if ("ANNUAL_INCOME".equalsIgnoreCase(fieldNameStr) || "INCOME".equalsIgnoreCase(fieldNameStr)) {
                        annualIncome = val.getFieldValue();
                    }
                }
            }

            java.util.List<java.util.Map<String, String>> docs = new java.util.ArrayList<>();
            if (app.getDocuments() != null) {
                for (com.example.gov_scheme_backend.entities.ApplicationDocument doc : app.getDocuments()) {
                    java.util.Map<String, String> docMap = new java.util.HashMap<>();
                    docMap.put("type", doc.getDocumentType() != null ? doc.getDocumentType().name() : "");
                    // Return documentUrl if available (Cloudinary URL), fall back to filePath for legacy records
                    String docUrl = (doc.getDocumentUrl() != null && !doc.getDocumentUrl().isBlank())
                            ? doc.getDocumentUrl()
                            : doc.getFilePath();
                    docMap.put("url", docUrl);
                    docs.add(docMap);
                }
            }

            map.put("fields", fields);
            map.put("documents", docs);
            map.put("annualIncome", annualIncome);
            map.put("aadhaar", aadhaar);
            map.put("phone", phone);
            map.put("district", district);
            map.put("state", state);
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/allocation")
    public ResponseEntity<?> allocateApplication(
            @RequestBody ApplicationAllocationRequestDTO request,
            HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        if (!Role.ADMIN.name().equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Only admins can allocate applications"));
        }

        if (request == null || request.getApplicationId() == null || request.getOfficerId() == null || request.getOfficerId().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Application ID and officer ID are required"));
        }

        Application application = applicationRepo.findById(request.getApplicationId())
                .orElseThrow(() -> new com.example.gov_scheme_backend.exceptions.ResourceNotFoundException("Application not found"));

        VerificationWorkflow workflow = workflowRepository.findByApplicationId(request.getApplicationId())
                .orElseThrow(() -> new com.example.gov_scheme_backend.exceptions.ResourceNotFoundException("Workflow not found"));

        if (ApplicationStatus.APPROVED.name().equalsIgnoreCase(String.valueOf(application.getStatus()))
                || ApplicationStatus.REJECTED.name().equalsIgnoreCase(String.valueOf(application.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Finalized applications cannot be reallocated"));
        }

        Users officer = resolveOfficer(request.getOfficerId());
        if (officer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, "Officer not found"));
        }

        WorkflowStage currentStage = workflow.getCurrentStage();
        if (currentStage != null && !isOfficerCompatible(officer, currentStage)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Selected officer does not match the current workflow stage"));
        }

        workflow.setAssignedOfficer(officer);
        workflowRepository.save(workflow);

        ApplicationAllocationResponseDTO response = new ApplicationAllocationResponseDTO(
                true,
                "Application allocated successfully",
                application.getId(),
                officer.getUniqueID(),
                officer.getFullName(),
                currentStage != null ? currentStage.name() : null,
                application.getStatus() != null ? application.getStatus().name() : null
        );
        return ResponseEntity.ok(response);
    }

    private Users resolveOfficer(String officerId) {
        Users officer = userRepo.findByuniqueID(officerId).orElse(null);
        if (officer != null) {
            return officer;
        }

        try {
            Long userId = Long.valueOf(officerId);
            return userRepo.findById(userId).orElse(null);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isOfficerCompatible(Users officer, WorkflowStage stage) {
        if (officer == null || officer.getRole() == null || stage == null) {
            return false;
        }

        return switch (stage) {
            case FIELD_OFFICER -> officer.getRole() == Role.FIELD_OFFICER;
            case DISTRICT_OFFICER -> officer.getRole() == Role.DISTRICT_OFFICER;
            case FINANCE_OFFICER -> officer.getRole() == Role.FINANCE_OFFICER;
            default -> false;
        };
    }

    private boolean isPrivilegedRole(String role) {
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return normalized.equals(Role.ADMIN.name())
                || normalized.equals(Role.FIELD_OFFICER.name())
                || normalized.equals(Role.DISTRICT_OFFICER.name())
                || normalized.equals(Role.FINANCE_OFFICER.name());
    }

    private boolean isOfficerRole(String role) {
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return normalized.equals(Role.FIELD_OFFICER.name())
                || normalized.equals(Role.DISTRICT_OFFICER.name())
                || normalized.equals(Role.FINANCE_OFFICER.name());
    }

    private boolean isAssignedToCurrentOfficer(Long userId, VerificationWorkflow workflow) {
        if (workflow == null || workflow.getAssignedOfficer() == null || userId == null) {
            return false;
        }

        return userId.equals(workflow.getAssignedOfficer().getId());
    }

    private boolean matchesOfficerStage(String role, VerificationWorkflow workflow) {
        if (workflow == null || workflow.getCurrentStage() == null || role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return switch (workflow.getCurrentStage()) {
            case FIELD_OFFICER -> normalized.equals(Role.FIELD_OFFICER.name());
            case DISTRICT_OFFICER -> normalized.equals(Role.DISTRICT_OFFICER.name());
            case FINANCE_OFFICER -> normalized.equals(Role.FINANCE_OFFICER.name());
            default -> false;
        };
    }

    private record ViewerContext(Long userId, String role) {}
}
