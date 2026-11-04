package com.jobflow.controller;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.JwtService;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FeedbackControllerIntegrationTest extends BaseIntegrationTest {

    private static final String VALID = """
            {"type":"BUG","message":"The dashboard is blank","email":"me@example.com","pageUrl":"/dashboard"}
            """;

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    // Same mocks as most controller tests, so this runs in their shared context
    @MockBean
    @SuppressWarnings("unused")
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private ResultActions send(String body, String token) throws Exception {
        MockHttpServletRequestBuilder request = post("/api/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "Test/1.0")
                .content(body);
        if (token != null) request.header("Authorization", "Bearer " + token);
        return mockMvc.perform(request);
    }

    private int rows() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM feedback", Integer.class);
    }

    @Test
    void anonymous_isSaved() throws Exception {
        send(VALID, null).andExpect(status().isNoContent());

        Map<String, Object> row = jdbcTemplate.queryForMap("SELECT * FROM feedback");
        assertThat(row.get("type")).isEqualTo("BUG");
        assertThat(row.get("message")).isEqualTo("The dashboard is blank");
        assertThat(row.get("email")).isEqualTo("me@example.com");
        assertThat(row.get("page_url")).isEqualTo("/dashboard");
        assertThat(row.get("user_agent")).isEqualTo("Test/1.0");
        assertThat(row.get("user_id")).isNull();
        assertThat(row.get("created_at")).isNotNull();
    }

    @Test
    void loggedIn_recordsWhoSentIt() throws Exception {
        User alice = userRepository.save(User.builder()
                .email("alice@test.com").name("Alice").provider(AuthProvider.LOCAL).build());

        send(VALID, jwtService.generateToken(alice)).andExpect(status().isNoContent());

        assertThat(jdbcTemplate.queryForObject("SELECT user_id FROM feedback", Long.class)).isEqualTo(alice.getId());
    }

    @Test
    void demoToken_countsAsAnonymous_insteadOf401() throws Exception {
        // The frontend demo sends a fake token; feedback from the demo should still get through
        send(VALID, "demo-token").andExpect(status().isNoContent());

        assertThat(rows()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT user_id FROM feedback", Long.class)).isNull();
    }

    @Test
    void invalidRequest_is400WithCode() throws Exception {
        send("""
                {"type":"BUG","message":"hey"}
                """, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").exists());

        send("""
                {"type":"COMPLAINT","message":"The dashboard is blank"}
                """, null)
                .andExpect(status().isBadRequest());

        assertThat(rows()).isZero();
    }

    @Test
    void honeypotFilled_looksAccepted_butIsDropped() throws Exception {
        send("""
                {"type":"OTHER","message":"Buy cheap watches","website":"https://spam.example"}
                """, null)
                .andExpect(status().isNoContent());

        assertThat(rows()).isZero();
    }

    @Test
    void sixthMessageFromOneIpInAnHour_is429() throws Exception {
        for (int i = 0; i < 5; i++) {
            send(VALID, null).andExpect(status().isNoContent());
        }

        send(VALID, null)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("FEEDBACK_RATE_LIMITED"))
                .andExpect(jsonPath("$.params.minutes").isNumber());
        assertThat(rows()).isEqualTo(5);
    }

    @Test
    void onlyPostIsOpen() throws Exception {
        // Nothing to read back: there's no GET, and it doesn't hand out a 200 to anyone
        mockMvc.perform(get("/api/feedback")).andExpect(status().isUnauthorized());
    }
}
