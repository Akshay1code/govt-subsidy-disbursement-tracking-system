package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.RequestsList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RequestRepo extends JpaRepository<RequestsList,Integer> {

    Optional<RequestsList> findByUniqueID(String uniqueId);
}
