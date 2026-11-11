package com.jobflow.security;

import com.jobflow.controller.BaseIntegrationTest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleTokenEncryptionIntegrationTest extends BaseIntegrationTest {

    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private GoogleTokenEncryptionMigration migration;

    private User saveUser(String access, String refresh) {
        return userRepository.save(User.builder()
                .email("gmail@example.com").name("Gmail User").provider(AuthProvider.GOOGLE)
                .googleAccessToken(access).googleRefreshToken(refresh)
                .build());
    }

    private String column(String name, Long userId) {
        return jdbcTemplate.queryForObject("SELECT " + name + " FROM users WHERE id = ?", String.class, userId);
    }

    @Test
    void storesTokensEncryptedAndReadsThemBackPlain() {
        User user = saveUser("ya29.access", "1//refresh");

        assertThat(column("google_access_token", user.getId())).startsWith("v1:").doesNotContain("ya29");
        assertThat(column("google_refresh_token", user.getId())).startsWith("v1:").doesNotContain("refresh");

        User loaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(loaded.getGoogleAccessToken()).isEqualTo("ya29.access");
        assertThat(loaded.getGoogleRefreshToken()).isEqualTo("1//refresh");
    }

    @Test
    void migrationEncryptsTokensSavedBeforeEncryption() {
        User user = saveUser(null, null);
        jdbcTemplate.update("UPDATE users SET google_access_token = 'ya29.old', google_refresh_token = '1//old' WHERE id = ?",
                user.getId());

        migration.run(null);

        assertThat(column("google_access_token", user.getId())).startsWith("v1:");
        assertThat(column("google_refresh_token", user.getId())).startsWith("v1:");
        User loaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(loaded.getGoogleAccessToken()).isEqualTo("ya29.old");
        assertThat(loaded.getGoogleRefreshToken()).isEqualTo("1//old");
    }

    @Test
    void migrationLeavesAlreadyEncryptedTokensAlone() {
        User user = saveUser("ya29.access", null);
        String before = column("google_access_token", user.getId());

        migration.run(null);

        assertThat(column("google_access_token", user.getId())).isEqualTo(before);
        assertThat(column("google_refresh_token", user.getId())).isNull();
    }
}
