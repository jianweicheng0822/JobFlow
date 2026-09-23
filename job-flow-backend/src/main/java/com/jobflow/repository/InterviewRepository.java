package com.jobflow.repository;

import com.jobflow.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    List<Interview> findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(
            Long userId, LocalDateTime dateTime);

    List<Interview> findByJobApplicationUserId(Long userId);

    Optional<Interview> findByIdAndJobApplicationUserId(Long id, Long userId);

    @Modifying
    @Query("DELETE FROM Interview i WHERE i.jobApplication.id = :appId")
    void deleteByJobApplicationId(Long appId);

    @Modifying
    @Query("DELETE FROM Interview i WHERE i.jobApplication.id IN :appIds")
    void deleteByJobApplicationIdIn(List<Long> appIds);

    @Query(value = """
        SELECT i.* FROM interviews i
        WHERE i.reminder_enabled = 1
          AND i.reminder_sent = 0
          AND i.interview_date > NOW()
          AND i.interview_date <= DATE_ADD(NOW(), INTERVAL i.reminder_hours_before HOUR)
        """, nativeQuery = true)
    List<Interview> findInterviewsNeedingReminder();
}
