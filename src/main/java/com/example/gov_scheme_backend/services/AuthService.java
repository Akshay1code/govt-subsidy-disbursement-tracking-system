package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.ApiResponse;
import com.example.gov_scheme_backend.dto.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.auth.LoginResponse;
import com.example.gov_scheme_backend.dto.auth.SignupRequest;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.models.Users;
import com.example.gov_scheme_backend.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {
    @Autowired
    UserRepo userRepo;
    @Autowired
    PasswordEncoder passwordEncoder;
    public LoginResponse loginService(LoginRequest user){
        if(!userRepo.existsByUsername(user.getUsername())){
            return new LoginResponse(false,"User Doesn't Exist",null);
        }
        return new LoginResponse(true,"Login Successfull","jwt.token");
    }


    public ApiResponse signupService(SignupRequest request) {
        if (request == null || request.getUsername() == null || request.getPassword() == null || request.getMobileNo() == null || request.getRole() == null) {
            return new ApiResponse(false, "Fields are empty");
        }
        if (!request.getUsername().matches("^[a-zA-Z0-9_]+$")) {
            return new ApiResponse(false, "Username doesn't meet with standard guidelines");
        }
        if (!request.getPassword().matches("^[A-Z](?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&]).{7,}$")) {
            return new ApiResponse(false, "Password doesn't meet the standard guidelines");
        }
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        request.setPassword(hashedPassword);
        Users user = new Users();
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setMobileNo(request.getMobileNo());
        user.setRole(request.getRole());
        userRepo.save(user);
        System.out.println(request);
        return new ApiResponse(true, "Signup Successfull");
    }
    public List<Users> profileService(Role role){
        return userRepo.findByRole(role);
    }

    public ApiResponse deleteProfile() {

    }
}


