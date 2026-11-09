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
import java.time.ZoneId;
import java.time.ZonedDateTime;

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
            shanghai(LocalDateTime.of(2030, 6, 15, 10, 0)),
            shanghai(LocalDateTime.of(2030, 6, 15, 10, 0)),
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
            .contains("Prepare algorithms")
            .doesNotContain("Their time");
    }

    @Test
    void sendInterviewReminder_bookedOnAnotherClock_showsBothTimes() {
        // 10 AM in Los Angeles is 1 AM the next day in Shanghai
        ZonedDateTime booked = LocalDateTime.of(2030, 6, 14, 10, 0).atZone(ZoneId.of("America/Los_Angeles"));
        emailService.sendInterviewReminder(
            "user@test.com", "Google", "Software Engineer",
            booked.withZoneSameInstant(ZoneId.of("Asia/Shanghai")), booked,
            "VIDEO", null);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getText())
            .contains("Time: 2030-06-15 01:00")
            .contains("Their time: 2030-06-14 10:00 (PDT)");
    }

    private static ZonedDateTime shanghai(LocalDateTime time) {
        return time.atZone(ZoneId.of("Asia/Shanghai"));
    }

    @Test
    void sendInterviewReminder_withoutNotes_omitsNotesLine() {
        emailService.sendInterviewReminder(
            "user@test.com",
            "Meta",
            "Product Manager",
            shanghai(LocalDateTime.of(2030, 7, 1, 14, 30)),
            shanghai(LocalDateTime.of(2030, 7, 1, 14, 30)),
            "ONSITE",
            null
        );

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage msg = captor.getValue();
        assertThat(msg.getText()).doesNotContain("Notes:");
    }
}
