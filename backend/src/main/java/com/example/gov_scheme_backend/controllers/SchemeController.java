package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.ApiResponse;
import com.example.gov_scheme_backend.dto.SchemesDto;
import com.example.gov_scheme_backend.services.SchemeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/gov/schemes")
public class SchemeController {
    @Autowired
    SchemeService schemeService;
    @PostMapping("/add")
    public ResponseEntity<ApiResponse> addScheme(@RequestBody SchemesDto req){
        ApiResponse res = schemeService.addService(req);
        if(!res.isStatus()){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }
}
