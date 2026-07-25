package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.ApplicationSubmitRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.services.ApplicationSubmitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "*")
public class ApplicationSubmitController {


    @Autowired
    private ApplicationSubmitService applicationSubmitService;


    @PostMapping("/submit")
    public ResponseEntity<ApiResponse> submitApplication(
            @RequestBody ApplicationSubmitRequestDTO request
    ){

        ApiResponse response =
                applicationSubmitService.submitApplication(request);

        return ResponseEntity.ok(response);
    }
}