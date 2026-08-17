package com.example.gov_scheme_backend.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cloudinary configuration.
 *
 * <p>Reads credentials from {@code application.properties} which in turn
 * resolve from environment variables:
 * <ul>
 *   <li>CLOUDINARY_CLOUD_NAME</li>
 *   <li>CLOUDINARY_API_KEY</li>
 *   <li>CLOUDINARY_API_SECRET</li>
 * </ul>
 * Never hard-code actual values here or in application.properties.
 */
@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @Value("${cloudinary.api-secret}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true
        ));
    }
}
