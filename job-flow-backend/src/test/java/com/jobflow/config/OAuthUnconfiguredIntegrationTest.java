package com.jobflow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.controller.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// A fresh install with no OAuth credentials at all: the app runs, password login works,
// and every OAuth entry point answers cleanly. There's deliberately no @MockBean for the
// OAuth success handler here, so the real one has to start without OAuth too.
class OAuthUnconfiguredIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationContext context;

    @Test
    void oauthLoginIsOff() {
        assertThat(context.getBeanNamesForType(ClientRegistrationRepository.class)).isEmpty();
    }

    @Test
    void providers_allOff() throws Exception {
        mockMvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.google").value(false))
                .andExpect(jsonPath("$.github").value(false))
                .andExpect(jsonPath("$.gmail").value(false))
                // No MAIL_* in tests
                .andExpect(jsonPath("$.emailReminders").value(false));
    }

    @Test
    void oauthStartUrls_return404() throws Exception {
        for (String provider : new String[] {"google", "github"}) {
            mockMvc.perform(get("/oauth2/authorization/" + provider))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("OAUTH_PROVIDER_NOT_CONFIGURED"))
                    .andExpect(jsonPath("$.params.provider").value(provider));
        }
    }

    @Test
    void passwordLoginStillWorks_andGmailSaysNotConfigured() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alice\",\"email\":\"alice@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alice@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/gmail/link").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GMAIL_NOT_CONFIGURED"));
        mockMvc.perform(post("/api/gmail/scan").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GMAIL_NOT_CONFIGURED"));
        // Status keeps working so Settings can render
        mockMvc.perform(get("/api/gmail/status").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gmailConnected").value(false));
    }

    @Test
    void gmailCallback_redirectsWithNotConfigured() throws Exception {
        mockMvc.perform(get("/api/gmail/callback").param("code", "x").param("state", "y"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("http://localhost:5173/settings?gmailLinked=false&error=not_configured"));
    }
}
