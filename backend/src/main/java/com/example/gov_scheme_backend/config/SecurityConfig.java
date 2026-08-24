package com.example.gov_scheme_backend.config;

import com.example.gov_scheme_backend.security.CustomUserDetailsService;
import com.example.gov_scheme_backend.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    CustomUserDetailsService customUserDetailsService;

    @Autowired
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth

                        // CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public scheme APIs
                        .requestMatchers(HttpMethod.GET, "/gov/schemes/**").permitAll()

                        // Existing public authentication APIs
                        .requestMatchers(
                                "/gov/auth/hello",
                                "/gov/auth/signin",
                                "/gov/auth/signup",
                                "/gov/auth/officer/get-request"
                        ).permitAll()

                        // Existing officer approval API
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/gov/auth/approval/**"
                        ).authenticated()

                        // M3 disbursement APIs
                        .requestMatchers(
                                "/api/v1/disbursement/**"
                        ).authenticated()

                        // M3 reports
                        .requestMatchers(
                                "/api/v1/reports/**"
                        ).authenticated()

                        // M3 test/scheduler endpoints
                        .requestMatchers(
                                "/api/v1/test/**"
                        ).authenticated()

                        // Everything else
                        .anyRequest().authenticated()
                )

                // Unauthenticated requests (missing/expired/invalid JWT cookie) get a
                // clean 401 with a JSON body instead of Spring Security's default bare
                // 403. This lets the frontend distinguish "session expired / not logged
                // in" (401) from "logged in but not permitted" (403, returned by the
                // controllers themselves).
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Session expired or not authenticated. Please log in again.\"}");
                }));

        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {

        org.springframework.web.cors.CorsConfiguration configuration =
                new org.springframework.web.cors.CorsConfiguration();

        // Allow all origins (using patterns to support credentials)
        configuration.setAllowedOriginPatterns(
                java.util.Arrays.asList("*"));

        configuration.setAllowedMethods(
                java.util.Arrays.asList(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                ));

        configuration.setAllowedHeaders(
                java.util.Arrays.asList("*"));

        configuration.setAllowCredentials(true);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source =
                new org.springframework.web.cors.UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(customUserDetailsService);

        provider.setPasswordEncoder(passwordEncoder());

        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {

        return configuration.getAuthenticationManager();
    }
}