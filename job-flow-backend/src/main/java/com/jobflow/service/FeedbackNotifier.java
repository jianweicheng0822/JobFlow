package com.jobflow.service;

import com.jobflow.config.MailSettings;
import com.jobflow.model.Feedback;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executor;

/**
 * Emails each new piece of feedback to {@code app.feedback.notify-email}.
 *
 * The message is built on the request thread (the sender's User is a lazy JPA proxy) and only
 * the send runs in the background, so a slow or broken SMTP server never holds up or fails a
 * submission. The row is already saved by then, so a failed send is only logged.
 */
@Component
@Slf4j
public class FeedbackNotifier {

    static final String SUBJECT_PREFIX = "[JobFlow Feedback] ";
    static final int SUBJECT_SNIPPET_MAX = 50;

    private final JavaMailSender mailSender;
    private final Executor executor;
    private final String notifyEmail;
    private final String fromEmail;
    private final boolean enabled;

    @Autowired
    public FeedbackNotifier(ObjectProvider<JavaMailSender> mailSender,
                            @Qualifier("applicationTaskExecutor") TaskExecutor executor,
                            MailSettings mailSettings,
                            @Value("${app.feedback.notify-email:}") String notifyEmail,
                            @Value("${spring.mail.username:}") String fromEmail) {
        this(mailSettings.isConfigured() ? mailSender.getIfAvailable() : null, executor, notifyEmail, fromEmail);
        // Say it once at startup, so a missing setting shows up in the logs instead of as silence
        if (enabled) {
            log.info("Feedback emails on: sending to the address in FEEDBACK_NOTIFY_EMAIL");
        } else if (this.notifyEmail.isEmpty()) {
            log.info("Feedback emails off: FEEDBACK_NOTIFY_EMAIL isn't set (feedback is still saved)");
        } else {
            log.info("Feedback emails off: MAIL_USERNAME and MAIL_PASSWORD aren't set (feedback is still saved)");
        }
    }

    FeedbackNotifier(JavaMailSender mailSender, Executor executor, String notifyEmail, String fromEmail) {
        this.mailSender = mailSender;
        this.executor = executor;
        this.notifyEmail = notifyEmail == null ? "" : notifyEmail.strip();
        this.fromEmail = fromEmail == null || fromEmail.isBlank() ? this.notifyEmail : fromEmail.strip();
        this.enabled = mailSender != null && !this.notifyEmail.isEmpty();
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Queue an email about this feedback. Returns right away and never throws. */
    public void notifyNew(Feedback feedback) {
        if (!enabled) return;
        try {
            SimpleMailMessage mail = buildMessage(feedback);
            executor.execute(() -> send(mail));
        } catch (RuntimeException e) {
            // Executor full or shutting down, or something odd in the row: the feedback is saved anyway
            log.warn("Couldn't queue feedback email: {}", e.getMessage());
        }
    }

    private void send(SimpleMailMessage mail) {
        try {
            mailSender.send(mail);
        } catch (MailException e) {
            log.warn("Couldn't email feedback notification: {}", e.getMessage());
        }
    }

    SimpleMailMessage buildMessage(Feedback feedback) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(notifyEmail);
        mail.setFrom(fromEmail);
        if (feedback.getEmail() != null) {
            // Hitting "Reply" goes straight back to the sender
            mail.setReplyTo(feedback.getEmail());
        }
        mail.setSubject(subject(feedback));
        mail.setText(body(feedback));
        return mail;
    }

    static String subject(Feedback feedback) {
        // Keep it on one line; the message is user input
        String oneLine = feedback.getMessage().replaceAll("\\s+", " ").strip();
        String snippet = oneLine.length() <= SUBJECT_SNIPPET_MAX
                ? oneLine
                : oneLine.substring(0, SUBJECT_SNIPPET_MAX) + "…";
        return SUBJECT_PREFIX + feedback.getType().name().toLowerCase() + ": " + snippet;
    }

    static String body(Feedback feedback) {
        String account = feedback.getUser() == null ? "(not logged in)" : feedback.getUser().getEmail();
        return """
                Type: %s
                Account: %s
                Reply to: %s
                Page: %s
                Sent: %s UTC

                %s
                """.formatted(
                feedback.getType().name().toLowerCase(),
                account,
                orDash(feedback.getEmail()),
                orDash(feedback.getPageUrl()),
                feedback.getCreatedAt(),
                feedback.getMessage());
    }

    private static String orDash(String s) {
        return s == null || s.isBlank() ? "-" : s;
    }
}
