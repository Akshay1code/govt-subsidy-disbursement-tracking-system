package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.ApiResponse;
import com.example.gov_scheme_backend.dto.request.auth.LoginRequest;
import com.example.gov_scheme_backend.dto.request.auth.SignupRequest;
import com.example.gov_scheme_backend.dto.response.auth.RequestListResponseDto;
import com.example.gov_scheme_backend.entities.RequestsList;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.entities.Users;
import com.example.gov_scheme_backend.enums.Status;
import com.example.gov_scheme_backend.exceptions.ResourceNotFoundException;
import com.example.gov_scheme_backend.security.JwtService;
import com.example.gov_scheme_backend.repositories.RequestRepo;
import com.example.gov_scheme_backend.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {
    @Autowired
    UserRepo userRepo;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    RequestRepo requestRepo;
    @Autowired
    JwtService jwtService;
    @Autowired
    AuthenticationManager authenticationManager;

    public String loginService(LoginRequest user){
        Users dbUser = userRepo.findByUsername(user.getUsername()).orElseThrow();
        System.out.println(passwordEncoder.matches(
                user.getPassword(),
                dbUser.getPassword()
        ));
        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));
        String token = jwtService.generateToken((Users) authentication.getPrincipal());
        return token;
    }


    public ApiResponse signupService(SignupRequest req) {
        System.out.println(req);
        if (req == null || req.getUsername() == null || req.getPassword() == null || req.getMobileNo() == null || req.getFullName() == null|| req.getDistrict() == null|| req.getRegion() == null||req.getState() == null) {
            return new ApiResponse(false, "Fields are empty");
        }
        if (!req.getUsername().matches("^[a-zA-Z0-9_]+$")) {
            return new ApiResponse(false, "Username doesn't meet with standard guidelines");
        }
        if (!req.getPassword().matches("^[A-Z](?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&]).{7,}$")) {
            return new ApiResponse(false, "Password doesn't meet the standard guidelines");
        }
        String hashedPassword = passwordEncoder.encode(req.getPassword());
        if(req.getRole() == null){
            Users user = new Users();
            user.setUniqueID("FAR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            user.setFullName(req.getFullName());
            user.setUsername(req.getUsername());
            user.setPassword(hashedPassword);
            user.setMobileNo(req.getMobileNo());
            user.setRegion(req.getRegion());
            user.setDistrict(req.getDistrict());
            user.setState(req.getState());
            user.setRole(Role.FARMER);
            userRepo.save(user);

            return new ApiResponse(true, "Signup Successfull");
        }

        RequestsList user = new RequestsList();
        user.setUniqueID("OFFI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        user.setFullName(req.getFullName());
        user.setUsername(req.getUsername());
        user.setPassword(hashedPassword);
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
            dto.setUniqueId(request.getUniqueID());
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

    public ApiResponse updateApprovalStatus(String uniqueId, String status) {
        RequestsList request =  requestRepo.findByUniqueID(uniqueId)
                .orElseThrow(() -> new ResourceNotFoundException("Officer not found"));
        Status requestStatus = Status.PENDING;
        if(status.equals("APPROVED")){
            requestStatus = Status.APPROVED;
        }
        if(status.equals("REJECTED")){
            requestStatus = Status.REJECTED;
        }

        Users user = new Users();
        user.setFullName(request.getFullName());
        user.setMobileNo(request.getMobileNo());
        user.setRole(request.getRole());
        user.setUniqueID(request.getUniqueID());
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setRegion(request.getRegion());
        user.setDistrict(request.getDistrict());
        user.setState(request.getState());
        userRepo.save(user);
        request.setStatus(requestStatus);
        requestRepo.save(request);

        return new ApiResponse(true,requestStatus+" Successfully");
    }
}


