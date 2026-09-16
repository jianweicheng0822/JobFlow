package com.jobflow.controller;

import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.JwtService;
import com.jobflow.service.GmailService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gmail")
@RequiredArgsConstructor
public class GmailController {

    private final GmailService gmailService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret:}")
    private String googleClientSecret;

    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String REDIRECT_URI = "http://localhost:8080/api/gmail/callback";
    private static final String GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

    @GetMapping("/link")
    public Map<String, String> getGmailLinkUrl(Authentication authentication) {
        User user = getUser(authentication);
        String token = jwtService.generateToken(user.getEmail());

        String authUrl = GOOGLE_AUTH_URL
                + "?client_id=" + encode(googleClientId)
                + "&redirect_uri=" + encode(REDIRECT_URI)
                + "&response_type=code"
                + "&scope=" + encode(GMAIL_SCOPE)
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + encode(token);

        return Map.of("authUrl", authUrl);
    }

    @GetMapping("/callback")
    public void handleCallback(@RequestParam("code") String code,
                               @RequestParam("state") String state,
                               HttpServletResponse response) throws IOException {
        // Validate JWT from state to identify the user
        if (!jwtService.validateToken(state)) {
            response.sendRedirect("http://localhost:5173/settings?gmailLinked=false&error=invalid_state");
            return;
        }

        String email = jwtService.getEmailFromToken(state);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            response.sendRedirect("http://localhost:5173/settings?gmailLinked=false&error=user_not_found");
            return;
        }

        // Exchange authorization code for tokens
        try {
            RestTemplate restTemplate = new RestTemplate();
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("code", code);
            params.add("client_id", googleClientId);
            params.add("client_secret", googleClientSecret);
            params.add("redirect_uri", REDIRECT_URI);
            params.add("grant_type", "authorization_code");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = restTemplate.postForObject(
                    GOOGLE_TOKEN_URL, request, Map.class);

            if (tokenResponse == null) {
                response.sendRedirect("http://localhost:5173/settings?gmailLinked=false&error=token_exchange_failed");
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

            response.sendRedirect("http://localhost:5173/settings?gmailLinked=true");
        } catch (Exception e) {
            response.sendRedirect("http://localhost:5173/settings?gmailLinked=false&error=token_exchange_failed");
        }
    }

    @PostMapping("/scan")
    public List<GmailImportPreviewDTO> scanEmails(Authentication authentication) {
        return gmailService.scanEmails(getUserId(authentication));
    }

    @PostMapping("/import")
    public GmailImportResultDTO importApplications(@RequestBody GmailImportConfirmRequest request,
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

    private Long getUserId(Authentication authentication) {
        return getUser(authentication).getId();
    }

    private User getUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
