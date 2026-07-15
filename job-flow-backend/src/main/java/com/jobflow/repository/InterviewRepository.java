package com.jobflow.repository;

import com.jobflow.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    // Upcoming interviews panel: future interviews sorted by date
    List<Interview> findByInterviewDateAfterOrderByInterviewDateAsc(LocalDateTime dateTime);
}