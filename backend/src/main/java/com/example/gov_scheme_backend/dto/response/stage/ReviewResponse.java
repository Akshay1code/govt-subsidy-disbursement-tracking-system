package com.example.gov_scheme_backend.dto.response.stage;

import com.example.gov_scheme_backend.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReviewResponse {

    private Long id;

    private String officerName;

    private Status status;

    private String remarks;

    private LocalDateTime reviewedAt;

}
