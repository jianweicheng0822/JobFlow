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

    // Done in one statement so an application saved in the meantime keeps its company
    @Modifying
    @Query("DELETE FROM Company c WHERE c.id = :id AND NOT EXISTS "
        + "(SELECT 1 FROM JobApplication a WHERE a.company.id = c.id)")
    int deleteIfUnused(Long id);

    @Modifying
    @Query("DELETE FROM Company c WHERE c.user.id = :userId")
    void deleteByUserId(Long userId);
}
