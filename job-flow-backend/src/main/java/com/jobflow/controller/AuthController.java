package com.jobflow.controller;

import com.jobflow.config.MailSettings;
import com.jobflow.config.OAuthProviders;
import com.jobflow.dto.AuthResponse;
import com.jobflow.dto.ChangePasswordRequest;
import com.jobflow.dto.DeleteAccountRequest;
import com.jobflow.dto.LoginRequest;
import com.jobflow.dto.OAuthExchangeRequest;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.dto.UpdateProfileRequest;
import com.jobflow.dto.UpdateTimeZoneRequest;
import com.jobflow.service.AccountDeletionService;
import com.jobflow.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuthProviders oAuthProviders;
    private final MailSettings mailSettings;
    private final AccountDeletionService accountDeletionService;

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
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }

    @PutMapping("/profile")
    public AuthResponse updateProfile(@AuthenticationPrincipal Long userId,
                                      @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(userId, request);
    }

    // Set from the browser on first login, and from Settings after that
    @PutMapping("/time-zone")
    public AuthResponse updateTimeZone(@AuthenticationPrincipal Long userId,
                                       @Valid @RequestBody UpdateTimeZoneRequest request) {
        return authService.updateTimeZone(userId, request.getTimeZone());
    }

    // Other sessions are signed out; the response carries a fresh token for this one
    @PutMapping("/password")
    public AuthResponse changePassword(@AuthenticationPrincipal Long userId,
                                       @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(userId, request);
    }

    // Body on a DELETE: needs the password (or the email, for OAuth-only accounts) to confirm
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal Long userId, @RequestBody DeleteAccountRequest request) {
        accountDeletionService.deleteAccount(userId, request);
    }
}
