package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationFieldValueRequestDTO;
import com.example.gov_scheme_backend.dto.response.application.ApplicationFieldValueResponseDTO;
import com.example.gov_scheme_backend.services.ApplicationFieldValueService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationFieldValueController {


    private final ApplicationFieldValueService service;


    @PostMapping("/{applicationId}/fields")
    public List<ApplicationFieldValueResponseDTO> saveFields(
            @PathVariable Long applicationId,
            @RequestBody List<ApplicationFieldValueRequestDTO> requests) {


        return service.saveFields(applicationId, requests);

    }



    @GetMapping("/{applicationId}/fields")
    public List<ApplicationFieldValueResponseDTO> getFields(
            @PathVariable Long applicationId) {


        return service.getFields(applicationId);

    }
}