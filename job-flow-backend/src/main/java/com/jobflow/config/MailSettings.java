package com.jobflow.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Whether the server can send email at all. Interview reminders are the only mail, so
 * without MAIL_USERNAME/MAIL_PASSWORD they're switched off and the form stops offering them,
 * instead of failing every 10 minutes.
 */
@Component
@Slf4j
public class MailSettings {

    private final boolean configured;

    public MailSettings(@Value("${spring.mail.username:}") String username,
                        @Value("${spring.mail.password:}") String password) {
        this.configured = !username.isBlank() && !password.isBlank();
        if (!configured) {
            log.info("Email reminders off: MAIL_USERNAME and MAIL_PASSWORD aren't set");
        }
    }

    public boolean isConfigured() {
        return configured;
    }
}
