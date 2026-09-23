package com.jobflow.service;

import com.jobflow.model.*;
import com.jobflow.repository.InterviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewReminderSchedulerTest {

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private InterviewReminderScheduler scheduler;

    private Interview buildInterview() {
        User user = User.builder().id(1L).email("alice@test.com").build();
        Company company = Company.builder().id(1L).name("Google").build();
        JobApplication app = JobApplication.builder()
            .id(10L)
            .user(user)
            .company(company)
            .positionTitle("Engineer")
            .status(ApplicationStatus.INTERVIEW)
            .build();

        return Interview.builder()
            .id(100L)
            .jobApplication(app)
            .interviewDate(LocalDateTime.now().plusHours(1))
            .interviewType(InterviewType.PHONE)
            .notes("Prep needed")
            .reminderEnabled(true)
            .reminderHoursBefore(6)
            .reminderSent(false)
            .build();
    }

    @Test
    void sendPendingReminders_sendsEmailAndMarksAsSent() {
        Interview interview = buildInterview();
        when(interviewRepository.findInterviewsNeedingReminder()).thenReturn(List.of(interview));

        scheduler.sendPendingReminders();

        verify(emailService).sendInterviewReminder(
            eq("alice@test.com"),
            eq("Google"),
            eq("Engineer"),
            any(LocalDateTime.class),
            eq("PHONE"),
            eq("Prep needed")
        );
        assertThat(interview.isReminderSent()).isTrue();
    }

    @Test
    void sendPendingReminders_emailFails_doesNotMarkAsSent() {
        Interview interview = buildInterview();
        when(interviewRepository.findInterviewsNeedingReminder()).thenReturn(List.of(interview));
        doThrow(new RuntimeException("SMTP error")).when(emailService)
            .sendInterviewReminder(any(), any(), any(), any(), any(), any());

        scheduler.sendPendingReminders();

        assertThat(interview.isReminderSent()).isFalse();
    }

    @Test
    void sendPendingReminders_noInterviews_doesNothing() {
        when(interviewRepository.findInterviewsNeedingReminder()).thenReturn(Collections.emptyList());

        scheduler.sendPendingReminders();

        verifyNoInteractions(emailService);
    }
}
