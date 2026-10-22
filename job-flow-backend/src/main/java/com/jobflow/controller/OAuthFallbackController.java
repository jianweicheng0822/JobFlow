package com.jobflow.controller;

import com.jobflow.exception.NotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Spring Security answers /oauth2/authorization/{provider} for configured providers.
// Anything that gets this far is a provider this server has no credentials for.
@RestController
public class OAuthFallbackController {

    @GetMapping("/oauth2/authorization/{provider}")
    public void providerNotConfigured(@PathVariable String provider) {
        throw new NotFoundException("OAUTH_PROVIDER_NOT_CONFIGURED",
                "Sign-in with " + provider + " isn't set up on this server", Map.of("provider", provider));
    }
}
