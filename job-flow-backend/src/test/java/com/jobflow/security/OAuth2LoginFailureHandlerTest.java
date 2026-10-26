package com.jobflow.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class OAuth2LoginFailureHandlerTest {

    private OAuth2LoginFailureHandler handler;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        handler = new OAuth2LoginFailureHandler();
        ReflectionTestUtils.setField(handler, "frontendUrl", "https://jobflow.example");
        response = new MockHttpServletResponse();
    }

    @Test
    void cancelOnConsentScreen_goesBackToLoginAsCancelled() throws Exception {
        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new OAuth2AuthenticationException(new OAuth2Error("access_denied")));

        assertThat(response.getRedirectedUrl()).isEqualTo("https://jobflow.example/login?oauthError=cancelled");
    }

    @Test
    void otherOAuthError_goesBackToLoginAsFailed() throws Exception {
        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new OAuth2AuthenticationException(new OAuth2Error("invalid_token_response")));

        assertThat(response.getRedirectedUrl()).isEqualTo("https://jobflow.example/login?oauthError=failed");
    }

    @Test
    void nonOAuthError_goesBackToLoginAsFailed() throws Exception {
        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new BadCredentialsException("nope"));

        assertThat(response.getRedirectedUrl()).isEqualTo("https://jobflow.example/login?oauthError=failed");
    }
}
