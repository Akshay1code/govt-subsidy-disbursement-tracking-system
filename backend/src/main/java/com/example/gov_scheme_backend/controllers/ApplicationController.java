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
import com.example.gov_scheme_backend.services.AllocationService;
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
    private AllocationService allocationService;
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

        String username = claims.getSubject();
        Users adminUser = userRepo.findByUsername(username).orElse(null);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Admin user not found"));
        }

        ApplicationAllocationResponseDTO response = allocationService.allocateApplicationToOfficer(request, adminUser);
        return ResponseEntity.ok(response);
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

    @Autowired
    private com.example.gov_scheme_backend.repositories.DisbursementPlanRepo disbursementPlanRepo;

    @Autowired
    private com.example.gov_scheme_backend.repositories.DisbursementMilestoneRepo disbursementMilestoneRepo;

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

        List<Long> appIds = apps.stream().map(Application::getId).filter(java.util.Objects::nonNull).toList();

        java.util.Map<Long, VerificationWorkflow> workflowMap = new java.util.HashMap<>();
        if (!appIds.isEmpty()) {
            try {
                for (VerificationWorkflow vw : workflowRepository.findByApplicationIdIn(appIds)) {
                    if (vw.getApplication() != null && vw.getApplication().getId() != null) {
                        workflowMap.put(vw.getApplication().getId(), vw);
                    }
                }
            } catch (Exception ignored) { }
        }

        List<com.example.gov_scheme_backend.entities.DisbursementPlan> plans = java.util.Collections.emptyList();
        java.util.Map<Long, com.example.gov_scheme_backend.entities.DisbursementPlan> planMap = new java.util.HashMap<>();
        if (!appIds.isEmpty()) {
            try {
                plans = disbursementPlanRepo.findByApplicationIdIn(appIds);
                for (com.example.gov_scheme_backend.entities.DisbursementPlan plan : plans) {
                    if (plan.getApplicationId() != null) {
                        planMap.put(plan.getApplicationId(), plan);
                    }
                }
            } catch (Exception ignored) { }
        }

        java.util.Map<Long, java.util.List<com.example.gov_scheme_backend.entities.DisbursementMilestone>> planMilestonesMap = new java.util.HashMap<>();
        if (!plans.isEmpty()) {
            try {
                java.util.List<com.example.gov_scheme_backend.entities.DisbursementMilestone> allMilestones =
                        disbursementMilestoneRepo.findByPlanInOrderByStageNumberAsc(plans);
                for (com.example.gov_scheme_backend.entities.DisbursementMilestone m : allMilestones) {
                    if (m.getPlan() != null && m.getPlan().getPlanId() != null) {
                        planMilestonesMap.computeIfAbsent(m.getPlan().getPlanId(), k -> new java.util.ArrayList<>()).add(m);
                    }
                }
            } catch (Exception ignored) { }
        }

        List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Application app : apps) {
            VerificationWorkflow workflow = workflowMap.get(app.getId());
            if (workflow == null) {
                // Fallback in case batch lookup missed or on single-item fetch
                workflow = workflowRepository.findByApplicationId(app.getId()).orElse(null);
            }
            if (viewerContext != null && isOfficerRole(viewerContext.role())) {
                boolean assignedToCurrentOfficer =
                        isAssignedToCurrentOfficer(viewerContext.userId(), app);
                boolean financeApprovedApplication =
                        "FINANCE_OFFICER".equalsIgnoreCase(viewerContext.role())
                        && workflow != null
                        && workflow.getCurrentStage() == WorkflowStage.COMPLETED
                        && app.getStatus() == ApplicationStatus.APPROVED;

                if (!assignedToCurrentOfficer && !financeApprovedApplication) {
                    continue;
                }
            }
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", app.getId());
            map.put("applicationId", app.getId());
            map.put("applicationCode", app.getApplicationCode());
            map.put("applicant", app.getUser() != null ? app.getUser().getFullName() : "Unknown");
            map.put("applicantName", app.getUser() != null ? app.getUser().getFullName() : "Unknown");
            map.put("schemeName", app.getScheme() != null ? app.getScheme().getSchemeName() : "Unknown");
            String code = app.getScheme() != null ? app.getScheme().getSchemeCode() : "";
            map.put("schemeId", code);
            map.put("schemeCode", code);
            String applicationStatus = app.getStatus() != null ? app.getStatus().toString() : "DRAFT";
            map.put("status", applicationStatus);
            map.put("applicationStatus", applicationStatus);
            map.put("remarks", app.getRemarks());
            map.put("createdAt", app.getCreatedAt());
            map.put("updatedAt", app.getUpdatedAt());
            String frontendStage = "PENDING";
            if (app.getStage() != null) {
                if (app.getStage() == com.example.gov_scheme_backend.enums.ReviewStage.COMPLETED) {
                    frontendStage = "COMPLETED";
                } else {
                    frontendStage = app.getStage().name() + "_OFFICER";
                }
            }
            map.put("currentStage", frontendStage);
            map.put(
                    "assignedOfficerId",
                    app.getAllocatedOfficer() != null
                            ? app.getAllocatedOfficer().getUniqueID()
                            : null);
            map.put(
                    "assignedOfficerDbId",
                    app.getAllocatedOfficer() != null
                            ? app.getAllocatedOfficer().getId()
                            : null);
            map.put(
                    "assignedOfficerName",
                    app.getAllocatedOfficer() != null
                            ? app.getAllocatedOfficer().getFullName()
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

            // Include full disbursement and milestone tracking details
            com.example.gov_scheme_backend.entities.DisbursementPlan plan = planMap.get(app.getId());
            if (plan == null) {
                try {
                    plan = disbursementPlanRepo.findByApplicationId(app.getId()).orElse(null);
                } catch (Exception ignored) { }
            }

            java.math.BigDecimal planAmount = plan != null && plan.getTotalAmount() != null ? plan.getTotalAmount() : java.math.BigDecimal.ZERO;
            map.put("amount", planAmount);
            map.put("hasDisbursementPlan", plan != null);
            map.put("planId", plan != null ? plan.getPlanId() : null);
            map.put("totalStages", plan != null ? plan.getTotalStages() : null);

            java.util.List<com.example.gov_scheme_backend.entities.DisbursementMilestone> milestones =
                    plan != null ? planMilestonesMap.getOrDefault(plan.getPlanId(), java.util.Collections.emptyList()) : java.util.Collections.emptyList();

            if (plan != null && milestones.isEmpty()) {
                try {
                    milestones = disbursementMilestoneRepo.findByPlanOrderByStageNumberAsc(plan);
                } catch (Exception ignored) { }
            }

            map.put("isPlanConfigured", !milestones.isEmpty());

            java.math.BigDecimal disbursedAmount = java.math.BigDecimal.ZERO;
            int releasedCount = 0;
            int totalMilestones = milestones.size();

            java.util.List<java.util.Map<String, Object>> milestoneMaps = new java.util.ArrayList<>();
            for (com.example.gov_scheme_backend.entities.DisbursementMilestone m : milestones) {
                if (m.getCompletionStatus() == com.example.gov_scheme_backend.enums.MilestoneStatus.RELEASED) {
                    releasedCount++;
                    if (m.getAmountReleased() != null) {
                        disbursedAmount = disbursedAmount.add(m.getAmountReleased());
                    } else if (m.getAmountToRelease() != null) {
                        disbursedAmount = disbursedAmount.add(m.getAmountToRelease());
                    }
                }
                java.util.Map<String, Object> mMap = new java.util.HashMap<>();
                mMap.put("milestoneId", m.getMilestoneId());
                mMap.put("stageNumber", m.getStageNumber());
                mMap.put("milestoneName", m.getMilestoneName());
                mMap.put("amountToRelease", m.getAmountToRelease());
                mMap.put("amountReleased", m.getAmountReleased());
                mMap.put("completionStatus", m.getCompletionStatus() != null ? m.getCompletionStatus().name() : "PENDING");
                mMap.put("dueDate", m.getDueDate());
                mMap.put("releaseDate", m.getReleaseDate());
                milestoneMaps.add(mMap);
            }

            map.put("disbursedAmount", disbursedAmount);
            map.put("milestones", milestoneMaps);

            String disbursementStatus = null;
            if (plan != null) {
                if (milestones.isEmpty()) {
                    disbursementStatus = "Approved / Ready for Plan";
                } else if (releasedCount == totalMilestones && totalMilestones > 0) {
                    disbursementStatus = "Fully Disbursed";
                } else if (releasedCount > 0) {
                    disbursementStatus = "Stage " + releasedCount + " Released / Stage " + (releasedCount + 1) + " Pending";
                } else {
                    disbursementStatus = "Plan Configured / Stage 1 Pending";
                }
            }
            map.put("disbursementStatus", disbursementStatus);

            response.add(map);
        }
        return ResponseEntity.ok(response);
    }



    private boolean isPrivilegedRole(String role) {
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return normalized.equals(Role.ADMIN.name())
                || normalized.equals(Role.FIELD_OFFICER.name())
                || normalized.equals(Role.DISTRICT_OFFICER.name())
                || normalized.equals(Role.REGIONAL_OFFICER.name())
                || normalized.equals(Role.FINANCE_OFFICER.name());
    }

    private boolean isOfficerRole(String role) {
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return normalized.equals(Role.FIELD_OFFICER.name())
                || normalized.equals(Role.DISTRICT_OFFICER.name())
                || normalized.equals(Role.REGIONAL_OFFICER.name())
                || normalized.equals(Role.FINANCE_OFFICER.name());
    }

    private boolean isAssignedToCurrentOfficer(Long userId, Application app) {
        if (app == null || app.getAllocatedOfficer() == null || userId == null) {
            return false;
        }
        return userId.equals(app.getAllocatedOfficer().getId());
    }

    private boolean matchesOfficerStage(String role, VerificationWorkflow workflow) {
        if (workflow == null || workflow.getCurrentStage() == null || role == null) {
            return false;
        }

        String normalized = role.toUpperCase();
        return switch (workflow.getCurrentStage()) {
            case FIELD_OFFICER -> normalized.equals(Role.FIELD_OFFICER.name());
            case DISTRICT_OFFICER -> normalized.equals(Role.DISTRICT_OFFICER.name());
            case REGIONAL_OFFICER -> normalized.equals(Role.REGIONAL_OFFICER.name());
            case FINANCE_OFFICER -> normalized.equals(Role.FINANCE_OFFICER.name());
            default -> false;
        };
    }


    private record ViewerContext(Long userId, String role) {}
}
