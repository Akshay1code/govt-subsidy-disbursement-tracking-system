package com.example.gov_scheme_backend.repositories;
import com.example.gov_scheme_backend.enums.Role;
import com.example.gov_scheme_backend.models.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepo extends JpaRepository<Users,Integer> {
    public boolean existsByUsername(String username);
    public Users save(Users user);

    List<Users> findByRole(Role role);
}
