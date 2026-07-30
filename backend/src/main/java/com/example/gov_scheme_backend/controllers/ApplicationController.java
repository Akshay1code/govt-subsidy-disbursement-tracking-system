package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationFieldValueResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;
import com.example.gov_scheme_backend.services.ApplicationFieldValueService;
import com.example.gov_scheme_backend.services.ApplicationService;
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
     ApplicationFieldValueService service;

    @PostMapping("/beneficiary/{applicationId}/save-fields")
    public List<ApplicationFieldValueResponseDTO> saveFields(
            @PathVariable Long applicationId,
            @RequestBody List<ApplicationFieldValueRequestDTO> requests) {

        return service.saveFields(applicationId, requests);

    }

    @GetMapping("/beneficiary/{applicationId}/get-fields")
    public List<ApplicationFieldValueResponseDTO> getFields(
            @PathVariable Long applicationId) {

        return service.getFields(applicationId);

    }
    @PostMapping("/beneficiary/submit")
    public ResponseEntity<ApplicationResponseDTO> submitApplication(
            @Valid @RequestBody ApplicationRequestDTO request) {

        ApplicationResponseDTO response = applicationService.submitApplication(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);

    }

}