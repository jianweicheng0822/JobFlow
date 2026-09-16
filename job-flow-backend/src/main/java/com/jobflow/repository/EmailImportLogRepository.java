package com.jobflow.repository;

import com.jobflow.model.EmailImportLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EmailImportLogRepository extends JpaRepository<EmailImportLog, Long> {

    boolean existsByUserIdAndGmailMessageId(Long userId, String gmailMessageId);

    List<EmailImportLog> findByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM EmailImportLog e WHERE e.jobApplication.id = :appId")
    void deleteByJobApplicationId(Long appId);

    @Modifying
    @Query("DELETE FROM EmailImportLog e WHERE e.jobApplication.id IN :appIds")
    void deleteByJobApplicationIdIn(List<Long> appIds);
}
