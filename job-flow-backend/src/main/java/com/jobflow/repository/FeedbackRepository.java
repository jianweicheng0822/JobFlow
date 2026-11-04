package com.jobflow.repository;

import com.jobflow.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // For the site-wide daily cap
    long countByCreatedAtGreaterThanEqual(LocalDateTime since);
}
