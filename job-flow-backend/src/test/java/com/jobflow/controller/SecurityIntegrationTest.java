package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void publicEndpoints_accessibleWithoutToken() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Alice");
        req.setEmail("alice@test.com");
        req.setPassword("password123");

        // Register is public
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void protectedEndpoint_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_returns401WithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_returns200WithValidToken() throws Exception {
        // Register to get a valid token
        RegisterRequest req = new RegisterRequest();
        req.setName("Alice");
        req.setEmail("alice@test.com");
        req.setPassword("password123");

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void accountEndpoints_return401WithoutToken() throws Exception {
        // These live under /api/auth but aren't public; they used to 500 without a token
        for (String path : new String[]{"/api/auth/profile", "/api/auth/password", "/api/auth/time-zone"}) {
            mockMvc.perform(put(path)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"x\",\"newPassword\":\"secret123\",\"timeZone\":\"UTC\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
