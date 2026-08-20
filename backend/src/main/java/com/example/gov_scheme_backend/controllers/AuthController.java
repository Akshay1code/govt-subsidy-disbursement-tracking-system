package com.example.gov_scheme_backend.controllers;
import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.request.auth.SignupRequest;
import com.example.gov_scheme_backend.dto.response.auth.RequestListResponseDto;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.services.impl.AuthServiceImpl;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/gov/auth")
public class AuthController {
    private static final int JWT_COOKIE_MAX_AGE_SECONDS = 60 * 30;

    @Autowired
    AuthServiceImpl authService;
    @GetMapping("/hello")
    public ResponseEntity<String> hello(){
        return ResponseEntity.status(HttpStatus.OK).body("Hi! Welcome to Government Subsidy and Disbursement Tracking System.");
    }
    @PostMapping("/signin")
    public ResponseEntity<?> login(@RequestBody LoginRequest user , HttpServletResponse response) {
        try {
            String token = authService.loginService(user);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Server is down"));
            }
            Cookie cookie = new Cookie("token", token);
            cookie.setHttpOnly(true);
            cookie.setSecure(false);
            cookie.setPath("/");
            cookie.setMaxAge(JWT_COOKIE_MAX_AGE_SECONDS);
            response.addCookie(cookie);
            return ResponseEntity.status(HttpStatus.OK).body(new ApiResponse(true, "Login Successfull"));
        } catch (UsernameNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Username not found"));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Password is incorrect"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ApiResponse(false, "Server is down"));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse> signup(@RequestBody SignupRequest user){
        System.out.println("========== SIGNUP CONTROLLER HIT ==========");
        ApiResponse response = authService.signupService(user);
        if(!response.isStatus()){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/officer/get-request")
    public ResponseEntity<?> getRequest(){
        List<RequestListResponseDto> res = authService.getRequests();
        if(res.isEmpty()){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiResponse(false,"Couldn't Fetch Details"));
        }
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }

    @GetMapping("/profile/{role}")
    public ResponseEntity<?> getProfilesByRole(@PathVariable String role) {
        try {
            Role parsedRole = Role.valueOf(role.toUpperCase());
            List<Users> users = authService.profileService(parsedRole);
            List<java.util.Map<String, Object>> response = new ArrayList<>();
            for (Users user : users) {
                java.util.Map<String, Object> item = new HashMap<>();
                item.put("id", user.getId());
                item.put("officerId", user.getUniqueID());
                item.put("uniqueID", user.getUniqueID());
                item.put("fullName", user.getFullName());
                item.put("role", user.getRole() != null ? user.getRole().name() : null);
                item.put("region", user.getRegion());
                item.put("district", user.getDistrict());
                item.put("state", user.getState());
                item.put("mobileNo", user.getMobileNo());
                item.put("username", user.getUsername());
                response.add(item);
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Invalid role provided"));
        }
    }

    @PatchMapping("/approval/{uniqueId}/{status}")
    public ResponseEntity<?> updateApprovalStatus(@PathVariable String uniqueId, @PathVariable String status) {
        return ResponseEntity.ok(
                authService.updateApprovalStatus(uniqueId, status)
        );
    }

    @GetMapping("/profile/get")
    public ResponseEntity<?> getMe() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() instanceof String) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "Not authenticated"));
        }
        Users user = (Users) auth.getPrincipal();
        return ResponseEntity.ok(user);
    }

    @PostMapping("/signout")
    public ResponseEntity<?> signout(HttpServletResponse response) {
        Cookie cookie = new Cookie("token", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(new ApiResponse(true, "Signed out successfully"));
    }

    @PutMapping("/profile/update")
    public ResponseEntity<ApiResponse> updateProfile(@RequestBody Users user) {
        ApiResponse res = authService.updateProfile(user);
        if(!res.isStatus()){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
        }
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }
}
