package com.jobflow.controller;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Guards the shortcuts in BaseIntegrationTest. Tests share one app context and one
 * database, so the first test here leaves state behind on purpose and the second
 * checks none of it survived.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TestIsolationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    // Same mocks as most controller tests, so this runs in their shared context
    @MockBean
    @SuppressWarnings("unused")
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    @Order(1)
    void leavesDataAndUsesUpTheRateLimit() throws Exception {
        userRepository.save(User.builder().email("left-over@test.com").name("Left").provider(AuthProvider.LOCAL).build());
        userRepository.save(User.builder().email("left-over-2@test.com").name("Left").provider(AuthProvider.LOCAL).build());

        // Burn through the 60 requests/minute allowance until we're blocked
        int status = 0;
        for (int i = 0; i < 61 && status != 429; i++) {
            status = login().andReturn().getResponse().getStatus();
        }
        assertThat(status).isEqualTo(429);
    }

    @Test
    @Order(2)
    void startsClean() throws Exception {
        assertThat(userRepository.count()).isZero();

        // Ids restart too, like on a brand new database
        User first = userRepository.save(User.builder().email("fresh@test.com").name("Fresh").provider(AuthProvider.LOCAL).build());
        assertThat(first.getId()).isEqualTo(1L);

        // And the rate limiter has forgotten the previous test's requests
        login().andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@test.com\",\"password\":\"wrong-password\"}"));
    }
}
