package com.jobflow.controller;

import com.jobflow.config.RateLimitInterceptor;
import com.jobflow.security.TokenVersions;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.MySQLContainer;

import java.sql.Statement;
import java.util.List;
import java.util.Map;

/**
 * Shared setup for tests that need the real app and a real MySQL.
 *
 * Kept fast on purpose: one MySQL container for the whole run, and Spring reuses the
 * app context between tests with the same config instead of restarting it for every
 * test. Isolation comes from resetting state before each test instead:
 * - every table is emptied (and its ids restart at 1), schema and Flyway history stay
 * - the rate limiter forgets earlier requests, since all tests call from 127.0.0.1
 * - the token version cache is emptied, since user ids start over at 1
 * Mocks from @MockBean are reset by Spring after each test. TestIsolationIntegrationTest
 * fails if any of this stops holding.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
// Public so integration tests outside this package can share the MySQL container setup
public abstract class BaseIntegrationTest {

    // Started once per test JVM; Testcontainers removes it when the JVM exits
    @ServiceConnection
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("jobflow_test");

    static {
        mysql.start();
    }

    @MockBean
    @SuppressWarnings("unused")
    private JavaMailSender javaMailSender;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RateLimitInterceptor rateLimitInterceptor;

    @Autowired
    private TokenVersions tokenVersions;

    @BeforeEach
    protected void resetDatabase() {
        jdbcTemplate.execute((ConnectionCallback<Void>) connection -> {
            List<String> tables = jdbcTemplate.queryForList(
                    "SELECT table_name FROM information_schema.tables "
                            + "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' "
                            + "AND table_name <> 'flyway_schema_history'",
                    String.class);
            // Same connection throughout: FOREIGN_KEY_CHECKS only applies to the session that set it
            try (Statement statement = connection.createStatement()) {
                statement.execute("SET FOREIGN_KEY_CHECKS = 0");
                for (String table : tables) {
                    statement.execute("TRUNCATE TABLE `" + table + "`");
                }
                statement.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });

        Map<?, ?> buckets = (Map<?, ?>) ReflectionTestUtils.getField(rateLimitInterceptor, "buckets");
        buckets.clear();

        ((Map<?, ?>) ReflectionTestUtils.getField(tokenVersions, "versions")).clear();
    }
}
