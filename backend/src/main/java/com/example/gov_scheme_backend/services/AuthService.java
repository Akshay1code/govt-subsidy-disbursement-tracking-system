package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.request.auth.LoginResponse;
import com.example.gov_scheme_backend.dto.request.auth.SignupRequest;
import com.example.gov_scheme_backend.dto.response.auth.RequestListResponseDto;
import com.example.gov_scheme_backend.entities.RequestsList;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Status;
import com.example.gov_scheme_backend.repositories.RequestRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class AuthService {
    @Autowired
    UserRepo userRepo;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    RequestRepo requestRepo;
    public LoginResponse loginService(LoginRequest user){
        if(!userRepo.existsByUsername(user.getUsername())){
            return new LoginResponse(false,"User Doesn't Exist",null);
        }
        return new LoginResponse(true,"Login Successfull","jwt.token");
    }


    public ApiResponse signupService(SignupRequest req) {
        System.out.println(req);
        if (req == null || req.getUsername() == null || req.getPassword() == null || req.getMobileNo() == null || req.getOfficerId() == null || req.getFullName() == null|| req.getDistrict() == null|| req.getRegion() == null||req.getState() == null) {
            return new ApiResponse(false, "Fields are empty");
        }
        if (!req.getUsername().matches("^[a-zA-Z0-9_]+$")) {
            return new ApiResponse(false, "Username doesn't meet with standard guidelines");
        }
        if (!req.getPassword().matches("^[A-Z](?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&]).{7,}$")) {
            return new ApiResponse(false, "Password doesn't meet the standard guidelines");
        }
        String hashedPassword = passwordEncoder.encode(req.getPassword());
        req.setPassword(hashedPassword);
        if(req.getRole() == null){
            Users user = new Users();
            user.setFullName(req.getFullName());
            user.setUsername(req.getUsername());
            user.setPassword(passwordEncoder.encode(req.getPassword()));
            user.setMobileNo(req.getMobileNo());
            user.setRole(Role.FARMER);
            userRepo.save(user);
            return new ApiResponse(true, "Signup Successfull");
        }

        RequestsList user = new RequestsList();
        user.setFullName(req.getFullName());
        user.setUsername(req.getUsername());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setMobileNo(req.getMobileNo());
        user.setRegion(req.getRegion());
        user.setDistrict(req.getDistrict());
        user.setStatus(Status.PENDING);
        user.setState(req.getState());
        user.setRole(req.getRole());
        requestRepo.save(user);
        return new ApiResponse(true, "Request Sent Successfully to Admin");

    }

    public List<Users> profileService(Role role){
        return userRepo.findByRole(role);
    }
    
    public ApiResponse deleteProfile() {
        return null;
    }

    public List <RequestListResponseDto> getRequests() {
        List<RequestListResponseDto> res = new ArrayList<>();
        List<RequestsList> officer = requestRepo.findAll();
        for (RequestsList request : officer) {

            RequestListResponseDto dto = new RequestListResponseDto();

            dto.setFullName(request.getFullName());
            dto.setRole(request.getRole());
            dto.setMobileNo(request.getMobileNo());
            dto.setRegion(request.getRegion());
            dto.setDistrict(request.getDistrict());
            dto.setState(request.getState());
            dto.setStatus(request.getStatus());
            dto.setCreatedAt(request.getCreatedAt().toString());
            dto.setUpdatedAt(request.getUpdatedAt().toString());
            res.add(dto);
        }
        return res;
    }
}


