package com.jobflow.controller;

import com.jobflow.config.MailSettings;
import com.jobflow.config.OAuthProviders;
import com.jobflow.dto.AuthResponse;
import com.jobflow.dto.ChangePasswordRequest;
import com.jobflow.dto.LoginRequest;
import com.jobflow.dto.OAuthExchangeRequest;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.dto.UpdateProfileRequest;
import com.jobflow.dto.UpdateTimeZoneRequest;
import com.jobflow.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuthProviders oAuthProviders;
    private final MailSettings mailSettings;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Which sign-in buttons and integrations the frontend should show
    @GetMapping("/providers")
    public Map<String, Boolean> getProviders() {
        return Map.of(
                "google", oAuthProviders.isGoogleEnabled(),
                "github", oAuthProviders.isGithubEnabled(),
                "gmail", oAuthProviders.isGmailEnabled(),
                "emailReminders", mailSettings.isConfigured());
    }

    // The OAuth redirect lands on the frontend with a one-time code; it trades it in here
    @PostMapping("/oauth/exchange")
    public AuthResponse exchangeOAuthCode(@Valid @RequestBody OAuthExchangeRequest request) {
        return authService.exchangeOAuthCode(request.getCode());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getCurrentUser(authentication.getName()));
    }

    @PutMapping("/profile")
    public AuthResponse updateProfile(Authentication authentication,
                                      @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(authentication.getName(), request);
    }

    // Set from the browser on first login, and from Settings after that
    @PutMapping("/time-zone")
    public AuthResponse updateTimeZone(Authentication authentication,
                                       @Valid @RequestBody UpdateTimeZoneRequest request) {
        return authService.updateTimeZone(authentication.getName(), request.getTimeZone());
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(Authentication authentication,
                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
    }
}
