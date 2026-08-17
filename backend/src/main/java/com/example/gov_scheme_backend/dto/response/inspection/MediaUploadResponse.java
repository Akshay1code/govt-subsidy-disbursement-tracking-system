package com.example.gov_scheme_backend.dto.response.inspection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaUploadResponse {
    private String mediaId;
    private String fileName;
    private String fileType;
    private long sizeBytes;
    private String url;
}
