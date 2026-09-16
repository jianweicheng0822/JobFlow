package com.jobflow.repository;

import com.jobflow.model.EmailImportLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailImportLogRepository extends JpaRepository<EmailImportLog, Long> {

    boolean existsByUserIdAndGmailMessageId(Long userId, String gmailMessageId);

    List<EmailImportLog> findByUserId(Long userId);
}
