package com.jobflow.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MailSettingsTest {

    @Test
    void configured_whenUsernameAndPasswordAreSet() {
        assertThat(new MailSettings("jobflow@example.com", "app-password").isConfigured()).isTrue();
    }

    @Test
    void off_whenEitherIsMissing() {
        assertThat(new MailSettings("", "").isConfigured()).isFalse();
        assertThat(new MailSettings("jobflow@example.com", " ").isConfigured()).isFalse();
        assertThat(new MailSettings("", "app-password").isConfigured()).isFalse();
    }
}
