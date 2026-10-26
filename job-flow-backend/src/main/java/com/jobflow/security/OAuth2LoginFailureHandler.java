package com.jobflow.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Sends a failed or cancelled OAuth sign-in back to the frontend's login page.
 * Without it Spring redirects to its own /login?error, which the backend doesn't serve.
 */
@Component
@Slf4j
public class OAuth2LoginFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    static final String CANCELLED = "cancelled";
    static final String FAILED = "failed";

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        String code = FAILED;
        if (exception instanceof OAuth2AuthenticationException oauth
                && "access_denied".equals(oauth.getError().getErrorCode())) {
            // The user pressed Cancel on the provider's consent screen
            code = CANCELLED;
        } else {
            log.warn("OAuth sign-in failed: {}", exception.getMessage());
        }
        getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?oauthError=" + code);
    }
}
