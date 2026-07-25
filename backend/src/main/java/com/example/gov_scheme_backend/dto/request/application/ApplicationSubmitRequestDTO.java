package com.example.gov_scheme_backend.dto.request.application;

import lombok.Data;

import java.util.List;

@Data
public class ApplicationSubmitRequestDTO {

    private Long beneficiaryId;

    private Integer schemeId;


    private List<ApplicationFieldValueRequestDTO> fields;


    private List<ApplicationDocumentRequestDTO> documents;
}