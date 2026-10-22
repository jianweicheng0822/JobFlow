package com.jobflow.config;

import com.jobflow.controller.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// The production setup: Google (and with it Gmail) plus GitHub all configured
@TestPropertySource(properties = {
        "app.oauth.google.client-id=test-google-id",
        "app.oauth.google.client-secret=test-google-secret",
        "app.oauth.github.client-id=test-github-id",
        "app.oauth.github.client-secret=test-github-secret"
})
class OAuthConfiguredIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void providers_allOn() throws Exception {
        mockMvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.google").value(true))
                .andExpect(jsonPath("$.github").value(true))
                .andExpect(jsonPath("$.gmail").value(true));
    }

    @Test
    void googleStart_redirectsToGoogleAskingOnlyForProfile() throws Exception {
        UriComponents redirect = redirectFrom("/oauth2/authorization/google");

        assertThat(redirect.getHost()).isEqualTo("accounts.google.com");
        assertThat(redirect.getQueryParams().getFirst("client_id")).isEqualTo("test-google-id");
        assertThat(decoded(redirect, "redirect_uri")).isEqualTo("http://localhost/login/oauth2/code/google");
        assertThat(decoded(redirect, "scope").split(" ")).containsExactlyInAnyOrder("email", "profile");
        // Signing in shouldn't make users click through a consent screen every time
        assertThat(redirect.getQueryParams().getFirst("access_type")).isNull();
        assertThat(redirect.getQueryParams().getFirst("prompt")).isNull();
    }

    @Test
    void githubStart_redirectsToGithub() throws Exception {
        UriComponents redirect = redirectFrom("/oauth2/authorization/github");

        assertThat(redirect.getHost()).isEqualTo("github.com");
        assertThat(redirect.getPath()).isEqualTo("/login/oauth/authorize");
        assertThat(redirect.getQueryParams().getFirst("client_id")).isEqualTo("test-github-id");
        assertThat(decoded(redirect, "redirect_uri")).isEqualTo("http://localhost/login/oauth2/code/github");
    }

    // A provider with no registration gets a clean 404 rather than Spring's 500
    @Test
    void unknownProvider_returns404() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/linkedin"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("OAUTH_PROVIDER_NOT_CONFIGURED"));
    }

    private UriComponents redirectFrom(String path) throws Exception {
        String location = mockMvc.perform(get(path))
                .andExpect(status().is3xxRedirection())
                .andReturn().getResponse().getRedirectedUrl();
        assertThat(location).isNotNull();
        return UriComponentsBuilder.fromUriString(location).build();
    }

    private static String decoded(UriComponents uri, String param) {
        return URLDecoder.decode(uri.getQueryParams().getFirst(param), StandardCharsets.UTF_8);
    }
}
