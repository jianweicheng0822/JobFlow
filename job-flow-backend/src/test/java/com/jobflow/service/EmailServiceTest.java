package com.jobflow.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @Test
    void sendInterviewReminder_sendsCorrectEmail() {
        emailService.sendInterviewReminder(
            "user@test.com",
            "Google",
            "Software Engineer",
            LocalDateTime.of(2030, 6, 15, 10, 0),
            "PHONE",
            "Prepare algorithms"
        );

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage msg = captor.getValue();
        assertThat(msg.getTo()).containsExactly("user@test.com");
        assertThat(msg.getSubject()).contains("Software Engineer").contains("Google");
        assertThat(msg.getText()).contains("Google")
            .contains("Software Engineer")
            .contains("2030-06-15 10:00")
            .contains("PHONE")
            .contains("Prepare algorithms");
    }

    @Test
    void sendInterviewReminder_withoutNotes_omitsNotesLine() {
        emailService.sendInterviewReminder(
            "user@test.com",
            "Meta",
            "Product Manager",
            LocalDateTime.of(2030, 7, 1, 14, 30),
            "ONSITE",
            null
        );

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage msg = captor.getValue();
        assertThat(msg.getText()).doesNotContain("Notes:");
    }
}
