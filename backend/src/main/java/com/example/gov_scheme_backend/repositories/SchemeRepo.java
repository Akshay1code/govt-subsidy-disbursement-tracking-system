package com.example.gov_scheme_backend.repositories;

import com.example.gov_scheme_backend.entities.Schemes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchemeRepo extends JpaRepository<Schemes,Long> {

}
