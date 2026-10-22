package com.jobflow.controller;

import com.jobflow.config.OAuthProviders;
import com.jobflow.dto.GmailImportConfirmRequest;
import jakarta.validation.Valid;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.service.GmailService;
import com.jobflow.service.OneTimeCodeService;
import com.jobflow.exception.ApiException;
import com.jobflow.exception.NotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gmail")
@RequiredArgsConstructor
public class GmailController {

    private final GmailService gmailService;
    private final UserRepository userRepository;
    private final OneTimeCodeService oneTimeCodeService;
    private final OAuthProviders oAuthProviders;

    @Value("${app.oauth.google.client-id:}")
    private String googleClientId;

    @Value("${app.oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${app.gmail.redirect-uri}")
    private String redirectUri;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
    private static final Duration LINK_STATE_TTL = Duration.ofMinutes(10);

    @GetMapping("/link")
    public Map<String, String> getGmailLinkUrl(Authentication authentication) {
        requireGmailConfigured();
        User user = getUser(authentication);
        // Google echoes "state" back in the callback URL, so it gets a one-time code rather than a JWT
        String state = oneTimeCodeService.issue(user, OneTimeCodePurpose.GMAIL_LINK, LINK_STATE_TTL);

        String authUrl = GOOGLE_AUTH_URL
                + "?client_id=" + encode(googleClientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode(GMAIL_SCOPE)
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + encode(state);

        return Map.of("authUrl", authUrl);
    }

    @GetMapping("/callback")
    public void handleCallback(@RequestParam(value = "code", required = false) String code,
                               @RequestParam(value = "state", required = false) String state,
                               @RequestParam(value = "error", required = false) String error,
                               HttpServletResponse response) throws IOException {
        if (!oAuthProviders.isGmailEnabled()) {
            response.sendRedirect(settingsUrl("gmailLinked=false&error=not_configured"));
            return;
        }

        // The user clicked "Cancel" on Google's consent screen (or Google sent no code at all)
        if (error != null || code == null || code.isBlank()) {
            response.sendRedirect(settingsUrl("gmailLinked=false&error=access_denied"));
            return;
        }

        // The state tells us who started the link, and only works once
        User user = oneTimeCodeService.consume(state, OneTimeCodePurpose.GMAIL_LINK).orElse(null);
        if (user == null) {
            response.sendRedirect(settingsUrl("gmailLinked=false&error=invalid_state"));
            return;
        }

        // Exchange authorization code for tokens
        try {
            RestTemplate restTemplate = new RestTemplate();
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("code", code);
            params.add("client_id", googleClientId);
            params.add("client_secret", googleClientSecret);
            params.add("redirect_uri", redirectUri);
            params.add("grant_type", "authorization_code");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = restTemplate.postForObject(
                    GOOGLE_TOKEN_URL, request, Map.class);

            if (tokenResponse == null) {
                response.sendRedirect(settingsUrl("gmailLinked=false&error=token_exchange_failed"));
                return;
            }

            String accessToken = (String) tokenResponse.get("access_token");
            String refreshToken = (String) tokenResponse.get("refresh_token");

            user.setGoogleAccessToken(accessToken);
            if (refreshToken != null) {
                user.setGoogleRefreshToken(refreshToken);
            }
            user.setGmailConnected(true);
            userRepository.save(user);

            response.sendRedirect(settingsUrl("gmailLinked=true"));
        } catch (Exception e) {
            response.sendRedirect(settingsUrl("gmailLinked=false&error=token_exchange_failed"));
        }
    }

    // The callback is a full-page visit from Google, so the user goes back to the Settings page
    private String settingsUrl(String query) {
        return frontendUrl + "/settings?" + query;
    }

    @PostMapping("/scan")
    public List<GmailImportPreviewDTO> scanEmails(Authentication authentication) {
        requireGmailConfigured();
        return gmailService.scanEmails(getUserId(authentication));
    }

    @PostMapping("/import")
    public GmailImportResultDTO importApplications(@Valid @RequestBody GmailImportConfirmRequest request,
                                                   Authentication authentication) {
        return gmailService.importApplications(getUserId(authentication), request);
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus(Authentication authentication) {
        User user = getUser(authentication);
        return Map.of(
                "gmailConnected", user.isGmailConnected(),
                "provider", user.getProvider().name()
        );
    }

    // Gmail import uses the Google OAuth client; without one there is nothing to link or scan
    private void requireGmailConfigured() {
        if (!oAuthProviders.isGmailEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "GMAIL_NOT_CONFIGURED",
                    "Gmail import isn't set up on this server", null);
        }
    }

    private Long getUserId(Authentication authentication) {
        return getUser(authentication).getId();
    }

    private User getUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> NotFoundException.user());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
