package com.jobflow.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Tells Google to drop JobFlow's Gmail access, so it disappears from the user's
 * "Third-party apps" list too. Best effort: a failure is logged and ignored.
 */
@Component
@Slf4j
public class GoogleTokenRevoker {

    private static final URI REVOKE_URI = URI.create("https://oauth2.googleapis.com/revoke");
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    // Revoking the refresh token ends the whole grant, access tokens included
    public void revoke(String token) {
        HttpRequest request = HttpRequest.newBuilder(REVOKE_URI)
            .timeout(TIMEOUT)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)))
            .build();
        try {
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            // 400 means the token was already dead, which is fine too
            if (response.statusCode() != 200 && response.statusCode() != 400) {
                log.warn("Google token revoke answered {}", response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Couldn't revoke Google token: {}", e.getMessage());
        }
    }
}
