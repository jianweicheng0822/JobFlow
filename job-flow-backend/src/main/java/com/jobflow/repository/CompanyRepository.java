package com.jobflow.repository;

import com.jobflow.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findByUserId(Long userId);

    Optional<Company> findByIdAndUserId(Long id, Long userId);

    Optional<Company> findByNameIgnoreCaseAndUserId(String name, Long userId);

    @Modifying
    @Query("DELETE FROM Company c WHERE c.user.id = :userId")
    void deleteByUserId(Long userId);
}
