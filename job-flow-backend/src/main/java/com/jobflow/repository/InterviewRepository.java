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

    // Coarse first pass for reminders. Interview times are each user's local wall-clock
    // time, so the scheduler decides what's actually due per user (see UserClock).
    // User and company are fetched along so the per-user check doesn't hit the DB again.
    @Query("""
        SELECT i FROM Interview i
        JOIN FETCH i.jobApplication a
        JOIN FETCH a.user
        JOIN FETCH a.company
        WHERE i.reminderEnabled = true
          AND i.reminderSent = false
          AND i.interviewDate > :from
          AND i.interviewDate <= :to
        """)
    List<Interview> findPendingRemindersBetween(LocalDateTime from, LocalDateTime to);
}
