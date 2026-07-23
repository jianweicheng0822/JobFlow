package com.jobflow.repository;

import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByUserIdOrderByUpdatedAtDesc(Long userId);

    List<JobApplication> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, ApplicationStatus status);

    List<JobApplication> findTop10ByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<JobApplication> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, ApplicationStatus status);

    long countByUserIdAndAppliedDateBetween(Long userId, LocalDate start, LocalDate end);
}
