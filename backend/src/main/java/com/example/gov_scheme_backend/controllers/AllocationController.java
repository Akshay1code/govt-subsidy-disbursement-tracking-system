package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.request.application.BatchAllocationRequestDTO;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.response.application.BatchAllocationResponseDTO;
import com.example.gov_scheme_backend.dto.response.application.OfficerWorkloadDTO;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.enums.WorkflowStage;
import com.example.gov_scheme_backend.repositories.UserRepo;
import com.example.gov_scheme_backend.services.AllocationService;
import com.example.gov_scheme_backend.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/allocation")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;
    private final JwtService jwtService;
    private final UserRepo userRepo;

    @GetMapping("/officers/available")
    public ResponseEntity<?> getAvailableOfficers(@RequestParam WorkflowStage stage, HttpServletRequest req) {
        if (!isAdmin(req)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse(false, "Only admins can view officer workloads"));
        }
        try {
            List<OfficerWorkloadDTO> workloads = allocationService.getAvailableOfficers(stage);
            return ResponseEntity.ok(workloads);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<?> batchAllocate(@RequestBody BatchAllocationRequestDTO request, HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "You are Unauthorised"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        if (!Role.ADMIN.name().equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse(false, "Only admins can allocate applications"));
        }

        String username = claims.getSubject();
        Users adminUser = userRepo.findByUsername(username).orElse(null);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "Admin user not found"));
        }

        if (request.getCount() <= 0 || request.getStage() == null) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Count must be greater than zero and stage must be provided."));
        }

        try {
            BatchAllocationResponseDTO response = allocationService.batchAllocate(request, adminUser);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new ApiResponse(false, "Allocation failed: " + e.getMessage()));
        }
    }

    private boolean isAdmin(HttpServletRequest req) {
        String token = jwtService.extractTokenFromCookie(req);
        if (token == null) return false;
        try {
            Claims claims = jwtService.extractAllClaims(token);
            String role = String.valueOf(claims.get("role")).toUpperCase();
            return Role.ADMIN.name().equals(role);
        } catch (Exception e) {
            return false;
        }
    }
}
