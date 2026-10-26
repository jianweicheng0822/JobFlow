package com.jobflow.controller;

import com.jobflow.model.*;
import com.jobflow.repository.*;
import com.jobflow.security.JwtService;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import com.jobflow.service.GoogleTokenRevoker;
import com.jobflow.service.OneTimeCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountDeletionIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private OneTimeCodeService oneTimeCodeService;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JobApplicationRepository jobApplicationRepository;
    @Autowired private InterviewRepository interviewRepository;
    @Autowired private EmailImportLogRepository emailImportLogRepository;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    // Never call Google from tests
    @MockBean
    private GoogleTokenRevoker googleTokenRevoker;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = userRepository.save(User.builder()
                .email("alice@test.com").name("Alice").password(passwordEncoder.encode("password123"))
                .provider(AuthProvider.LOCAL).build());
        bob = userRepository.save(User.builder()
                .email("bob@test.com").name("Bob").password(passwordEncoder.encode("password123"))
                .provider(AuthProvider.LOCAL).build());
        fillWithData(alice);
        fillWithData(bob);
    }

    // One of everything that points at a user, so a missed table shows up as an FK error
    private void fillWithData(User user) {
        Company company = companyRepository.save(Company.builder().name("Acme").user(user).build());
        JobApplication app = jobApplicationRepository.save(JobApplication.builder()
                .positionTitle("Engineer").user(user).company(company)
                .status(ApplicationStatus.INTERVIEW).appliedDate(LocalDate.of(2026, 10, 1)).build());
        interviewRepository.save(Interview.builder()
                .jobApplication(app).interviewDate(LocalDateTime.of(2026, 11, 2, 10, 0))
                .interviewType(InterviewType.VIDEO).reminderHoursBefore(24).build());
        emailImportLogRepository.save(EmailImportLog.builder()
                .user(user).gmailMessageId("msg-" + user.getId()).jobApplication(app).build());
        oneTimeCodeService.issue(user, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofMinutes(1));
    }

    private ResultActions deleteAs(User user, String body) throws Exception {
        return mockMvc.perform(delete("/api/auth/me")
                .header("Authorization", "Bearer " + jwtService.generateToken(user.getEmail()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private int rowsOf(String table, User user) {
        String sql = switch (table) {
            case "interviews" -> "SELECT COUNT(*) FROM interviews i JOIN job_applications a ON a.id = i.job_application_id WHERE a.user_id = ?";
            case "users" -> "SELECT COUNT(*) FROM users WHERE id = ?";
            default -> "SELECT COUNT(*) FROM " + table + " WHERE user_id = ?";
        };
        return jdbcTemplate.queryForObject(sql, Integer.class, user.getId());
    }

    @Test
    void passwordAccount_withRightPassword_deletesEverythingItOwns() throws Exception {
        deleteAs(alice, "{\"password\":\"password123\"}").andExpect(status().isNoContent());

        for (String table : new String[] {"users", "companies", "job_applications", "interviews", "email_import_logs", "one_time_codes"}) {
            assertThat(rowsOf(table, alice)).as(table).isZero();
            // Bob's data is untouched
            assertThat(rowsOf(table, bob)).as(table).isEqualTo(1);
        }

        // And the old credentials are gone
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alice@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isBadRequest());
        verify(googleTokenRevoker, never()).revoke(any());
    }

    @Test
    void passwordAccount_withWrongPassword_keepsTheAccount() throws Exception {
        deleteAs(alice, "{\"password\":\"wrong-password\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CURRENT_PASSWORD_INCORRECT"));

        assertThat(rowsOf("users", alice)).isEqualTo(1);
        assertThat(rowsOf("job_applications", alice)).isEqualTo(1);
    }

    @Test
    void passwordAccount_withoutPassword_isRefused() throws Exception {
        deleteAs(alice, "{\"confirmEmail\":\"alice@test.com\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CURRENT_PASSWORD_REQUIRED"));

        assertThat(rowsOf("users", alice)).isEqualTo(1);
    }

    @Test
    void oauthAccount_confirmsWithEmail_andGmailAccessIsRevoked() throws Exception {
        User carol = userRepository.save(User.builder()
                .email("carol@gmail.com").name("Carol").provider(AuthProvider.GOOGLE).providerId("google-1")
                .googleAccessToken("access").googleRefreshToken("refresh").gmailConnected(true).build());
        fillWithData(carol);

        deleteAs(carol, "{\"confirmEmail\":\"wrong@gmail.com\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DELETE_CONFIRMATION_MISMATCH"));
        assertThat(rowsOf("users", carol)).isEqualTo(1);

        deleteAs(carol, "{\"confirmEmail\":\" Carol@Gmail.com \"}").andExpect(status().isNoContent());

        assertThat(rowsOf("users", carol)).isZero();
        assertThat(rowsOf("job_applications", carol)).isZero();
        verify(googleTokenRevoker).revoke("refresh");
    }

    @Test
    void withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(rowsOf("users", alice)).isEqualTo(1);
    }
}
