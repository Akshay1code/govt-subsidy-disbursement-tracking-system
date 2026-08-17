package com.example.gov_scheme_backend.services;

import org.springframework.web.multipart.MultipartFile;

/**
 * Contract for all Cloudinary operations.
 *
 * <p>Upload logic must never be placed directly in a controller or in
 * {@code ApplicationServiceImpl}. All Cloudinary SDK calls are
 * delegated to the implementation of this interface.
 */
public interface CloudinaryService {

    /**
     * Uploads a file to Cloudinary under the specified folder.
     *
     * @param file   the multipart file received from the HTTP request
     * @param folder the Cloudinary folder (e.g. "govt-scheme-docs")
     * @return the Cloudinary {@code secure_url} of the uploaded file
     * @throws com.example.gov_scheme_backend.exceptions.BadRequestException
     *         if the file type or size is invalid
     * @throws RuntimeException if the Cloudinary upload fails
     */
    String uploadFile(MultipartFile file, String folder);

    /**
     * Extracts the Cloudinary {@code public_id} from an upload result.
     * Useful when you need to delete or replace a file later.
     *
     * @param file   the multipart file (used for name derivation when needed)
     * @param folder the Cloudinary folder
     * @return the {@code public_id} returned by Cloudinary
     */
    String getPublicId(MultipartFile file, String folder);

    /**
     * Deletes a previously uploaded file from Cloudinary.
     *
     * @param publicId the Cloudinary {@code public_id} of the file to delete
     */
    void deleteFile(String publicId);
}
