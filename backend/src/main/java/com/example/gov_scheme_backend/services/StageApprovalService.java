package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.response.stage.ReviewResponse;
import java.util.List;

public interface StageApprovalService {
    
    void approveApplication(Long applicationId, Long officerId, String remarks);
    
    void rejectApplication(Long applicationId, Long officerId, String remarks);
    
    List<ReviewResponse> getApplicationReviews(Long applicationId);
}
