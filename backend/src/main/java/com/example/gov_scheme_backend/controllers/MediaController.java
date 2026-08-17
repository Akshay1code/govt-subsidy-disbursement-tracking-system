package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.inspection.MediaUploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/media")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MediaController {

    /**
     * POST /api/media/upload
     * Accepts a multipart image file, stores it (currently in-memory/temp), and returns a unique media ID.
     *
     * In production, replace the file storage logic with S3/GCS/local disk persistence.
     */
    @PostMapping("/upload")
    public ResponseEntity<MediaUploadResponse> uploadMedia(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            throw new RuntimeException("Uploaded file is empty.");
        }

        String mediaId = "img_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        MediaUploadResponse response = MediaUploadResponse.builder()
                .mediaId(mediaId)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .sizeBytes(file.getSize())
                // In production, replace with actual storage URL
                .url("/api/media/" + mediaId)
                .build();

        return ResponseEntity.ok(response);
    }
}
