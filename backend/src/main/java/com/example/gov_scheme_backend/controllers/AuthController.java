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

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/gov/auth")
public class AuthController {
    @Autowired
    AuthServiceImpl authService;
    @GetMapping("/hello")
    public ResponseEntity<String> hello(){
        return ResponseEntity.status(HttpStatus.OK).body("Hi! Welcome to Government Subsidy and Disbursement Tracking System.");
    }
    @PostMapping("/signin")
    public ResponseEntity<?> login(@RequestBody LoginRequest user , HttpServletResponse response) {
        String token = authService.loginService(user);
        if (token == null) {
            return null;
        }
        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 1000);
        response.addCookie(cookie);
        return ResponseEntity.status(HttpStatus.OK).body(new ApiResponse(true, "Login Successfull"));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse> signup(@RequestBody SignupRequest user){
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

    @PatchMapping("/approval/{uniqueId}/{status}")
    public ResponseEntity<?> updateApprovalStatus(@PathVariable String uniqueId, @PathVariable String status) {
        return ResponseEntity.ok(
                authService.updateApprovalStatus(uniqueId, status)
        );
    }
}
