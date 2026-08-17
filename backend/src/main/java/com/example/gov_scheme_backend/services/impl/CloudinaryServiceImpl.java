package com.example.gov_scheme_backend.services.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.gov_scheme_backend.exceptions.BadRequestException;
import com.example.gov_scheme_backend.services.CloudinaryService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Cloudinary-specific implementation of {@link CloudinaryService}.
 *
 * <p>This class is the <em>only</em> place in the codebase that directly
 * calls the Cloudinary SDK. All upload/delete operations must go through
 * this service.
 *
 * <p><b>Validation rules applied before upload:</b>
 * <ul>
 *   <li>Allowed MIME types: PDF, PNG, JPG/JPEG</li>
 *   <li>Maximum file size: 5 MB</li>
 *   <li>File must not be empty</li>
 * </ul>
 */
@Service
public class CloudinaryServiceImpl implements CloudinaryService {

    // Allowed MIME types for government scheme documents
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpg",
            "image/jpeg"
    );

    // Maximum allowed file size: 5 MB
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;

    private final Cloudinary cloudinary;

    // Constructor injection — no @Autowired field injection
    public CloudinaryServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * {@inheritDoc}
     *
     * <p>Validates file type and size, then uploads to Cloudinary.
     * Returns the {@code secure_url} from the Cloudinary response.
     */
    @Override
    public String uploadFile(MultipartFile file, String folder) {
        validateFile(file);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder",        folder,
                            "resource_type", "auto",   // handles both images and PDFs
                            "use_filename",  true,
                            "unique_filename", true
                    )
            );

            String secureUrl = (String) uploadResult.get("secure_url");

            if (secureUrl == null || secureUrl.isBlank()) {
                throw new RuntimeException(
                        "Cloudinary upload succeeded but returned no secure_url");
            }

            return secureUrl;

        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to upload document to Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Uploads the file and extracts only the {@code public_id}.
     * Use this when you need to store the ID for future deletion/replacement.
     */
    @Override
    public String getPublicId(MultipartFile file, String folder) {
        validateFile(file);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder",          folder,
                            "resource_type",   "auto",
                            "use_filename",    true,
                            "unique_filename", true
                    )
            );

            String publicId = (String) uploadResult.get("public_id");

            if (publicId == null || publicId.isBlank()) {
                throw new RuntimeException(
                        "Cloudinary upload succeeded but returned no public_id");
            }

            return publicId;

        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to upload document to Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Calls the Cloudinary destroy API. Silently logs if the delete
     * fails (non-critical path — the database record is cleaned up
     * separately by the caller if needed).
     */
    @Override
    public void deleteFile(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", "auto")
            );
        } catch (IOException e) {
            // Log but do not rethrow — deletion failure is non-critical
            System.err.println("[CloudinaryService] Failed to delete file with publicId="
                    + publicId + ": " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Document file must not be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException(
                    "Document exceeds the maximum allowed size of 5 MB. " +
                    "Received size: " + (file.getSize() / (1024 * 1024)) + " MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException(
                    "Unsupported document type: '" + contentType + "'. " +
                    "Allowed types: PDF, PNG, JPG, JPEG");
        }
    }
}
