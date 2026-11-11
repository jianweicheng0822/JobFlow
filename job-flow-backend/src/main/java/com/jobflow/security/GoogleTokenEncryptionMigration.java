package com.jobflow.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Encrypts Google tokens that were saved before TokenCipher existed. Runs on every start
 * and finds nothing after the first time.
 *
 * Plain JDBC on purpose: loading the users through JPA wouldn't help, because the converter
 * hands back the same plain text and Hibernate would see nothing to update.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenEncryptionMigration implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final TokenCipher cipher;

    @Override
    public void run(ApplicationArguments args) {
        if (!cipher.isEnabled()) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, google_access_token, google_refresh_token FROM users
                WHERE (google_access_token IS NOT NULL AND google_access_token NOT LIKE 'v1:%')
                   OR (google_refresh_token IS NOT NULL AND google_refresh_token NOT LIKE 'v1:%')
                """);
        for (Map<String, Object> row : rows) {
            jdbc.update("UPDATE users SET google_access_token = ?, google_refresh_token = ? WHERE id = ?",
                    encryptIfPlain((String) row.get("google_access_token")),
                    encryptIfPlain((String) row.get("google_refresh_token")),
                    row.get("id"));
        }
        if (!rows.isEmpty()) {
            log.info("Encrypted stored Google tokens for {} user(s)", rows.size());
        }
    }

    private String encryptIfPlain(String value) {
        return value == null || TokenCipher.isEncrypted(value) ? value : cipher.encrypt(value);
    }
}
