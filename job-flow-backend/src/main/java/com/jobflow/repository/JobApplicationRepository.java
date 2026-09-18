package com.jobflow.repository;

import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByUserIdOrderByUpdatedAtDesc(Long userId);

    Page<JobApplication> findByUserId(Long userId, Pageable pageable);

    Page<JobApplication> findByUserIdAndStatus(Long userId, ApplicationStatus status, Pageable pageable);

    @Query("SELECT ja FROM JobApplication ja WHERE ja.user.id = :userId " +
           "AND (LOWER(ja.positionTitle) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ja.company.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<JobApplication> searchByKeyword(Long userId, String keyword, Pageable pageable);

    @Query("SELECT ja FROM JobApplication ja WHERE ja.user.id = :userId AND ja.status = :status " +
           "AND (LOWER(ja.positionTitle) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ja.company.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<JobApplication> searchByKeywordAndStatus(Long userId, String keyword, ApplicationStatus status, Pageable pageable);

    List<JobApplication> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, ApplicationStatus status);

    List<JobApplication> findTop10ByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<JobApplication> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT ja.id FROM JobApplication ja WHERE ja.company.id = :companyId")
    List<Long> findIdsByCompanyId(Long companyId);

    @Modifying
    @Query("DELETE FROM JobApplication ja WHERE ja.company.id = :companyId")
    void deleteByCompanyId(Long companyId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, ApplicationStatus status);

    long countByUserIdAndAppliedDateBetween(Long userId, LocalDate start, LocalDate end);
}
