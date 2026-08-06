package com.example.gov_scheme_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GovSchemeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(GovSchemeBackendApplication.class, args);
	}

}
