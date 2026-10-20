package com.jobflow.repository;

import com.jobflow.model.OneTimeCode;
import com.jobflow.model.OneTimeCodePurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OneTimeCodeRepository extends JpaRepository<OneTimeCode, Long> {

    @Query("SELECT c FROM OneTimeCode c JOIN FETCH c.user WHERE c.codeHash = :codeHash AND c.purpose = :purpose")
    Optional<OneTimeCode> findWithUser(String codeHash, OneTimeCodePurpose purpose);

    // Returns how many rows went away, so two requests racing on one code can tell who won
    @Modifying
    @Query("DELETE FROM OneTimeCode c WHERE c.id = :id")
    int deleteByIdReturningCount(Long id);

    @Modifying
    @Query("DELETE FROM OneTimeCode c WHERE c.expiresAt <= :now")
    int deleteExpired(LocalDateTime now);
}
