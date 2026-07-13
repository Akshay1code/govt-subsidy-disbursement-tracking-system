package com.example.gov_scheme_backend.controllers;
import com.example.gov_scheme_backend.dto.ApiResponse;
import com.example.gov_scheme_backend.dto.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.auth.LoginResponse;
import com.example.gov_scheme_backend.dto.auth.SignupRequest;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.models.Users;
import com.example.gov_scheme_backend.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/gov/auth")
public class AuthController {
    @Autowired
    AuthService authService;
    @GetMapping("/hello")
    public ResponseEntity<String> hello(){
        return ResponseEntity.status(HttpStatus.OK).body("Hi! Welcome to Government Subsidy and Disbursement Tracking System.");
    }
    @PostMapping("/signin")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest user){
        LoginResponse response = authService.loginService(user);
        if(!response.isStatus()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse> signup(@RequestBody SignupRequest user){
        ApiResponse response = authService.signupService(user);
        if(!response.isStatus()){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    @GetMapping("/profile/{role}")
    public List<Users> profile(@PathVariable Role role){
        return authService.profileService(role);
    }
    @DeleteMapping("/delete")
    public ResponseEntity<ApiResponse> deleteProfile(){
        ApiResponse res = authService.deleteProfile();
        if(!res.isStatus()){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
        }
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }

}
