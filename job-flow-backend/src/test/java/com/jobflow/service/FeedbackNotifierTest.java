package com.jobflow.service;

import com.jobflow.model.Feedback;
import com.jobflow.model.FeedbackType;
import com.jobflow.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class FeedbackNotifierTest {

    // Run the "background" send inline so the tests can check it
    private static final Executor INLINE = Runnable::run;

    @Mock
    private JavaMailSender mailSender;

    private FeedbackNotifier notifier(String notifyEmail) {
        return new FeedbackNotifier(mailSender, INLINE, notifyEmail, "sender@example.com");
    }

    private static Feedback feedback(String message, String email, User user) {
        return Feedback.builder()
                .type(FeedbackType.BUG).message(message).email(email).user(user)
                .pageUrl("/dashboard").createdAt(LocalDateTime.of(2026, 11, 3, 23, 30))
                .build();
    }

    private SimpleMailMessage sent() {
        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mail.capture());
        return mail.getValue();
    }

    @Test
    void noAddressConfigured_isOffAndSendsNothing() {
        FeedbackNotifier off = notifier("  ");

        off.notifyNew(feedback("Broken page", null, null));

        assertThat(off.isEnabled()).isFalse();
        verifyNoInteractions(mailSender);
    }

    @Test
    void noMailSender_isOff() {
        FeedbackNotifier off = new FeedbackNotifier(null, INLINE, "inbox@example.com", "");

        assertThat(off.isEnabled()).isFalse();
        assertThatCode(() -> off.notifyNew(feedback("Broken page", null, null))).doesNotThrowAnyException();
    }

    @Test
    void sendsToConfiguredAddress_withReplyToTheSender() {
        User alice = User.builder().id(1L).email("alice@test.com").build();

        notifier("inbox@example.com").notifyNew(feedback("The dashboard is blank", "visitor@example.com", alice));

        SimpleMailMessage mail = sent();
        assertThat(mail.getTo()).containsExactly("inbox@example.com");
        assertThat(mail.getFrom()).isEqualTo("sender@example.com");
        assertThat(mail.getReplyTo()).isEqualTo("visitor@example.com");
        assertThat(mail.getSubject()).isEqualTo("[JobFlow Feedback] bug: The dashboard is blank");
        assertThat(mail.getText())
                .contains("The dashboard is blank")
                .contains("Account: alice@test.com")
                .contains("Page: /dashboard")
                .contains("Sent: 2026-11-03T23:30 UTC");
    }

    @Test
    void anonymousWithoutEmail_leavesReplyToUnset() {
        notifier("inbox@example.com").notifyNew(feedback("Broken page", null, null));

        SimpleMailMessage mail = sent();
        assertThat(mail.getReplyTo()).isNull();
        assertThat(mail.getText()).contains("Account: (not logged in)").contains("Reply to: -");
    }

    @Test
    void subject_longOrMultilineMessage_isOneShortLine() {
        String subject = FeedbackNotifier.subject(feedback("line one\r\nline two " + "x".repeat(100), null, null));

        assertThat(subject)
                .doesNotContain("\n").doesNotContain("\r")
                .startsWith("[JobFlow Feedback] bug: line one line two ")
                .endsWith("…")
                .hasSize(FeedbackNotifier.SUBJECT_PREFIX.length() + "bug: ".length()
                        + FeedbackNotifier.SUBJECT_SNIPPET_MAX + 1);
    }

    @Test
    void messageIsBuiltBeforeHandingOff_soTheBackgroundThreadNeverTouchesTheEntity() {
        List<Runnable> queued = new ArrayList<>();
        FeedbackNotifier deferred = new FeedbackNotifier(mailSender, queued::add, "inbox@example.com", "");
        Feedback feedback = feedback("Original text", null, null);

        deferred.notifyNew(feedback);
        feedback.setMessage("Changed after submit");
        queued.forEach(Runnable::run);

        assertThat(sent().getText()).contains("Original text");
    }

    @Test
    void smtpFailure_isSwallowed() {
        doThrow(new MailSendException("Authentication failed")).when(mailSender).send(any(SimpleMailMessage.class));

        assertThatCode(() -> notifier("inbox@example.com").notifyNew(feedback("Broken page", null, null)))
                .doesNotThrowAnyException();
    }

    @Test
    void executorRejects_isSwallowed() {
        Executor full = task -> { throw new RejectedExecutionException("queue full"); };
        FeedbackNotifier n = new FeedbackNotifier(mailSender, full, "inbox@example.com", "");

        assertThatCode(() -> n.notifyNew(feedback("Broken page", null, null))).doesNotThrowAnyException();
        verifyNoInteractions(mailSender);
    }

    @Test
    void noSenderConfigured_fallsBackToNotifyAddress() {
        FeedbackNotifier n = new FeedbackNotifier(mailSender, INLINE, "inbox@example.com", "");

        assertThat(n.buildMessage(feedback("Broken page", null, null)).getFrom()).isEqualTo("inbox@example.com");
    }
}
