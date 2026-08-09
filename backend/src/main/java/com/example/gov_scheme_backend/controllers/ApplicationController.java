package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.EligibilityEngineScoreDTO;
import com.example.gov_scheme_backend.security.JwtService;
import com.example.gov_scheme_backend.services.ApplicationService;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.enums.RuleField;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping
    public ResponseEntity<?> getAllApplications() {
        return getApplicationsList();
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyApplications() {
        return getApplicationsList();
    }

    private ResponseEntity<?> getApplicationsList() {
        List<Application> apps = applicationRepo.findAll();
        List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Application app : apps) {
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
                    "submittedDate",
                    "DRAFT".equalsIgnoreCase(applicationStatus) || "PENDING".equalsIgnoreCase(applicationStatus)
                            ? app.getCreatedAt()
                            : (app.getUpdatedAt() != null ? app.getUpdatedAt() : app.getCreatedAt()));

            String annualIncome = null;
            String aadhaar = null;
            String phone = app.getUser() != null ? app.getUser().getMobileNo() : null;
            if (app.getFieldValues() != null) {
                for (com.example.gov_scheme_backend.entities.ApplicationFieldValue val : app.getFieldValues()) {
                    String fieldNameStr = val.getFieldName() != null ? val.getFieldName().name() : "";
                    if ("INCOME".equalsIgnoreCase(fieldNameStr)) {
                        annualIncome = val.getFieldValue();
                    }
                }
            }
            map.put("annualIncome", annualIncome);
            map.put("aadhaar", aadhaar);
            map.put("phone", phone);
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }
}
