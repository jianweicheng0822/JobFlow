package com.jobflow.config;

import org.springframework.core.env.Environment;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;

import java.util.ArrayList;
import java.util.List;

/**
 * Which OAuth providers this server has credentials for. A provider is on when both its
 * client id and secret are set, and off when neither is. Gmail import rides on the Google
 * client, so it's available exactly when Google sign-in is.
 */
public class OAuthProviders {

    private final ClientRegistration google;
    private final ClientRegistration github;

    OAuthProviders(ClientRegistration google, ClientRegistration github) {
        this.google = google;
        this.github = github;
    }

    public static OAuthProviders fromEnvironment(Environment env) {
        ClientRegistration google = provider(env, "google", "GOOGLE", CommonOAuth2Provider.GOOGLE,
                "email", "profile", "https://www.googleapis.com/auth/gmail.readonly");
        ClientRegistration github = provider(env, "github", "GITHUB", CommonOAuth2Provider.GITHUB,
                "user:email", "read:user");
        return new OAuthProviders(google, github);
    }

    // Null when the provider isn't configured. Half a config is a mistake worth failing on:
    // quietly hiding the button would make a typo in production secrets easy to miss.
    private static ClientRegistration provider(Environment env, String id, String envPrefix,
                                               CommonOAuth2Provider preset, String... scopes) {
        String clientId = env.getProperty("app.oauth." + id + ".client-id", "").trim();
        String clientSecret = env.getProperty("app.oauth." + id + ".client-secret", "").trim();
        if (clientId.isEmpty() && clientSecret.isEmpty()) {
            return null;
        }
        if (clientId.isEmpty() || clientSecret.isEmpty()) {
            throw new IllegalStateException(envPrefix + "_CLIENT_ID and " + envPrefix + "_CLIENT_SECRET must be set together. "
                    + "Only one of them is set, so " + id + " sign-in can't work. Set both, or neither to turn it off.");
        }
        return preset.getBuilder(id)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .scope(scopes)
                .build();
    }

    public boolean isGoogleEnabled() {
        return google != null;
    }

    public boolean isGithubEnabled() {
        return github != null;
    }

    public boolean isGmailEnabled() {
        return isGoogleEnabled();
    }

    public List<ClientRegistration> registrations() {
        List<ClientRegistration> all = new ArrayList<>();
        if (google != null) all.add(google);
        if (github != null) all.add(github);
        return all;
    }

    public List<String> enabledNames() {
        return registrations().stream().map(ClientRegistration::getRegistrationId).toList();
    }
}
