package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationResponseDTO;
import com.example.gov_scheme_backend.services.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApplicationResponseDTO> submitApplication(
            @Valid @RequestBody ApplicationRequestDTO request) {

        ApplicationResponseDTO response =
                applicationService.submitApplication(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}