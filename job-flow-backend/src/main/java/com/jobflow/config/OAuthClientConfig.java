package com.jobflow.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;

/**
 * Registers only the OAuth providers that have credentials, instead of Spring Boot's
 * spring.security.oauth2.client.registration.* which refuses an empty client id.
 * With none configured there's no ClientRegistrationRepository, and SecurityConfig
 * leaves OAuth login off entirely.
 */
@Configuration
@Slf4j
public class OAuthClientConfig {

    @Bean
    public OAuthProviders oAuthProviders(Environment env) {
        OAuthProviders providers = OAuthProviders.fromEnvironment(env);
        // Handy for checking a deployment picked up its secrets
        log.info("OAuth sign-in enabled: {}", providers.enabledNames().isEmpty() ? "none" : providers.enabledNames());
        return providers;
    }

    @Bean
    @Conditional(AnyProviderConfigured.class)
    public ClientRegistrationRepository clientRegistrationRepository(OAuthProviders providers) {
        return new InMemoryClientRegistrationRepository(providers.registrations());
    }

    static class AnyProviderConfigured implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            try {
                return !OAuthProviders.fromEnvironment(context.getEnvironment()).registrations().isEmpty();
            } catch (IllegalStateException e) {
                // Half-configured: oAuthProviders() fails startup with the full message
                return false;
            }
        }
    }
}
