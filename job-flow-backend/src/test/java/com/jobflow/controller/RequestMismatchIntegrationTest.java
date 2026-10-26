package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Requests that match no endpoint are the client's mistake, so they get a 4xx, not a 500
class RequestMismatchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private String token;

    @BeforeEach
    void signUp() throws Exception {
        String body = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alice\",\"email\":\"alice@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        token = objectMapper.readTree(body).get("token").asText();
    }

    @Test
    void unknownPath_is404() throws Exception {
        mockMvc.perform(get("/api/does-not-exist").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void wrongMethod_is405_andSaysWhichMethodsWork() throws Exception {
        mockMvc.perform(delete("/api/companies").header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", allOf(containsString("GET"), containsString("POST"))))
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.params.method").value("DELETE"));
    }

    @Test
    void wrongContentType_is415() throws Exception {
        mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("name=Acme"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void wrongContentType_onAPublicEndpoint_is415Too() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .content("email=alice@test.com&password=password123"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
