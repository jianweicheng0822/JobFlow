package com.jobflow.service;

import com.jobflow.model.OneTimeCode;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.model.User;
import com.jobflow.repository.OneTimeCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Random single-use codes that can safely travel in a URL instead of a JWT.
 * A code expires quickly and is deleted the moment it's used.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OneTimeCodeService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OneTimeCodeRepository repository;
    private final UserClock userClock;

    @Transactional
    public String issue(User user, OneTimeCodePurpose purpose, Duration ttl) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        repository.save(OneTimeCode.builder()
                .codeHash(hash(code))
                .purpose(purpose)
                .user(user)
                .expiresAt(userClock.nowUtc().plus(ttl))
                .build());
        return code;
    }

    /**
     * Uses up the code and returns its user. Empty when the code is unknown, expired,
     * meant for something else, or already used (including by a request racing this one).
     */
    @Transactional
    public Optional<User> consume(String code, OneTimeCodePurpose purpose) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        Optional<OneTimeCode> found = repository.findWithUser(hash(code), purpose);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        OneTimeCode otc = found.get();
        // Delete before checking expiry so an expired code doesn't linger until the next purge
        boolean won = repository.deleteByIdReturningCount(otc.getId()) == 1;
        if (!won || !otc.getExpiresAt().isAfter(userClock.nowUtc())) {
            return Optional.empty();
        }
        return Optional.of(otc.getUser());
    }

    @Scheduled(fixedRate = 3_600_000) // hourly
    @Transactional
    public void purgeExpired() {
        int removed = repository.deleteExpired(userClock.nowUtc());
        if (removed > 0) {
            log.debug("Removed {} expired one-time code(s)", removed);
        }
    }

    private static String hash(String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            // Every JVM ships SHA-256
            throw new IllegalStateException(e);
        }
    }
}
