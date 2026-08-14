package com.example.gov_scheme_backend.services;

import com.example.gov_scheme_backend.dto.request.workflow.WorkflowActionRequest;
import com.example.gov_scheme_backend.dto.response.workflow.WorkflowResponse;
import com.example.gov_scheme_backend.entities.Application;
import com.example.gov_scheme_backend.entities.Users;

public interface WorkflowService {

    void createWorkflow(Application application);

    WorkflowResponse processAction(
            Long applicationId,
            WorkflowActionRequest request,
            Users currentUser
    );

}