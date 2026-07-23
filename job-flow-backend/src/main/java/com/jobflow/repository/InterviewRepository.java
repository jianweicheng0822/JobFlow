package com.jobflow.repository;

import com.jobflow.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    List<Interview> findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(
            Long userId, LocalDateTime dateTime);

    List<Interview> findByJobApplicationUserId(Long userId);

    Optional<Interview> findByIdAndJobApplicationUserId(Long id, Long userId);
}
