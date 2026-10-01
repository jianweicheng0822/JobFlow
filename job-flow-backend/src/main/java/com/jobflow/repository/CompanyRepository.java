package com.jobflow.repository;

import com.jobflow.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    java.util.List<Company> findByUserId(Long userId);

    java.util.Optional<Company> findByIdAndUserId(Long id, Long userId);

    java.util.Optional<Company> findByNameIgnoreCaseAndUserId(String name, Long userId);
}