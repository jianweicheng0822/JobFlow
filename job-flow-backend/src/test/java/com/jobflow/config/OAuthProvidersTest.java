package com.jobflow.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OAuthProvidersTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(OAuthClientConfig.class);

    @Test
    void nothingSet_everythingOff() {
        OAuthProviders providers = OAuthProviders.fromEnvironment(new MockEnvironment());

        assertThat(providers.isGoogleEnabled()).isFalse();
        assertThat(providers.isGithubEnabled()).isFalse();
        assertThat(providers.isGmailEnabled()).isFalse();
        assertThat(providers.registrations()).isEmpty();
    }

    // What an empty value from docker-compose (${GOOGLE_CLIENT_ID:-}) looks like
    @Test
    void blankValues_countAsNotSet() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.oauth.google.client-id", "  ")
                .withProperty("app.oauth.google.client-secret", "");

        assertThat(OAuthProviders.fromEnvironment(env).isGoogleEnabled()).isFalse();
    }

    @Test
    void bothSet_registersWithTheScopesWeNeed() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.oauth.google.client-id", "g-id")
                .withProperty("app.oauth.google.client-secret", "g-secret")
                .withProperty("app.oauth.github.client-id", "gh-id")
                .withProperty("app.oauth.github.client-secret", "gh-secret");

        OAuthProviders providers = OAuthProviders.fromEnvironment(env);

        assertThat(providers.enabledNames()).containsExactly("google", "github");
        assertThat(providers.isGmailEnabled()).isTrue();
        ClientRegistration google = providers.registrations().get(0);
        assertThat(google.getClientId()).isEqualTo("g-id");
        assertThat(google.getClientSecret()).isEqualTo("g-secret");
        assertThat(google.getScopes()).containsExactlyInAnyOrder(
                "email", "profile", "https://www.googleapis.com/auth/gmail.readonly");
        // Same callback path the Google/GitHub consoles already have registered
        assertThat(google.getRedirectUri()).isEqualTo("{baseUrl}/{action}/oauth2/code/{registrationId}");
        assertThat(providers.registrations().get(1).getScopes()).containsExactlyInAnyOrder("user:email", "read:user");
    }

    @Test
    void onlyGithubSet_googleAndGmailStayOff() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.oauth.github.client-id", "gh-id")
                .withProperty("app.oauth.github.client-secret", "gh-secret");

        OAuthProviders providers = OAuthProviders.fromEnvironment(env);

        assertThat(providers.enabledNames()).containsExactly("github");
        assertThat(providers.isGmailEnabled()).isFalse();
    }

    @Test
    void idWithoutSecret_failsWithAClearMessage() {
        MockEnvironment env = new MockEnvironment().withProperty("app.oauth.google.client-id", "g-id");

        assertThatThrownBy(() -> OAuthProviders.fromEnvironment(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together");
    }

    @Test
    void halfConfigured_stopsStartup() {
        contextRunner
                .withPropertyValues("app.oauth.github.client-secret=gh-secret")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().rootCause()
                        .hasMessageContaining("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together"));
    }

    @Test
    void noProviders_noClientRegistrationRepository() {
        contextRunner.run(context -> assertThat(context)
                .hasNotFailed()
                .doesNotHaveBean(ClientRegistrationRepository.class));
    }

    @Test
    void someProvider_registersOnlyThatOne() {
        contextRunner
                .withPropertyValues("app.oauth.github.client-id=gh-id", "app.oauth.github.client-secret=gh-secret")
                .run(context -> {
                    ClientRegistrationRepository repo = context.getBean(ClientRegistrationRepository.class);
                    assertThat(repo.findByRegistrationId("github")).isNotNull();
                    assertThat(repo.findByRegistrationId("google")).isNull();
                });
    }
}
