package com.jobflow.repository;

import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    // Stats cards: count by each status
    long countByStatus(ApplicationStatus status);

    // Kanban board: list applications by status
    List<JobApplication> findByStatusOrderByUpdatedAtDesc(ApplicationStatus status);

    // Recently updated applications table
    List<JobApplication> findTop10ByOrderByUpdatedAtDesc();

    // Activity chart: count applications by applied date range
    long countByAppliedDateBetween(java.time.LocalDate start, java.time.LocalDate end);
}