package com.jobflow.service;

import com.jobflow.model.*;
import com.jobflow.repository.InterviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewReminderSchedulerTest {

    // 01:45 UTC Oct 7 = 7:45pm Oct 6 in Denver = 9:45am Oct 7 in Shanghai
    private static final Instant NOW = Instant.parse("2026-10-07T01:45:00Z");
    private static final LocalDateTime UTC_NOW = LocalDateTime.of(2026, 10, 7, 1, 45);

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private EmailService emailService;

    @Spy
    private UserClock userClock = new UserClock(Clock.fixed(NOW, ZoneOffset.UTC));

    @InjectMocks
    private InterviewReminderScheduler scheduler;

    private static Interview interview(long id, String zone, LocalDateTime localStart, int hoursBefore) {
        User user = User.builder().id(id).email("user" + id + "@test.com").timeZone(zone).build();
        JobApplication app = JobApplication.builder()
            .id(id)
            .user(user)
            .company(Company.builder().id(1L).name("Google").build())
            .positionTitle("Engineer")
            .status(ApplicationStatus.INTERVIEW)
            .build();
        return Interview.builder()
            .id(id)
            .jobApplication(app)
            .interviewDate(localStart)
            .interviewType(InterviewType.PHONE)
            .notes("Prep needed")
            .reminderEnabled(true)
            .reminderHoursBefore(hoursBefore)
            .reminderSent(false)
            .build();
    }

    private void candidates(Interview... interviews) {
        when(interviewRepository.findPendingRemindersBetween(UTC_NOW.minusDays(1), UTC_NOW.plusDays(2)))
            .thenReturn(List.of(interviews));
    }

    @Test
    void sendsWhenDueOnTheUsersOwnClock() {
        // 8:30pm in Denver, 45 minutes from the user's now, 1h reminder
        Interview denver = interview(1, "America/Denver", LocalDateTime.of(2026, 10, 6, 20, 30), 1);
        candidates(denver);

        scheduler.sendPendingReminders();

        verify(emailService).sendInterviewReminder(
            eq("user1@test.com"), eq("Google"), eq("Engineer"),
            eq(LocalDateTime.of(2026, 10, 6, 20, 30)), eq("PHONE"), eq("Prep needed"));
        assertThat(denver.isReminderSent()).isTrue();
    }

    @Test
    void sameWallClockTimeIsAlreadyPastInShanghai() {
        // 8:30pm Oct 6 has long passed for someone whose clock says 9:45am Oct 7
        Interview shanghai = interview(2, "Asia/Shanghai", LocalDateTime.of(2026, 10, 6, 20, 30), 1);
        candidates(shanghai);

        scheduler.sendPendingReminders();

        verifyNoInteractions(emailService);
        assertThat(shanghai.isReminderSent()).isFalse();
    }

    @Test
    void eachUserGetsTheirOwnWindow() {
        LocalDateTime tenThirtyOct7 = LocalDateTime.of(2026, 10, 7, 10, 30);
        // 45 minutes away in Shanghai -> due
        Interview shanghai = interview(3, "Asia/Shanghai", tenThirtyOct7, 1);
        // Almost 15 hours away in Denver -> not yet
        Interview denver = interview(4, "America/Denver", tenThirtyOct7, 1);
        candidates(shanghai, denver);

        scheduler.sendPendingReminders();

        assertThat(shanghai.isReminderSent()).isTrue();
        assertThat(denver.isReminderSent()).isFalse();
        verify(emailService, times(1)).sendInterviewReminder(eq("user3@test.com"), any(), any(), any(), any(), any());
    }

    @Test
    void longerReminderWindowStartsEarlier() {
        // 10:30am Oct 7 in Denver is ~14h45 away: inside a 24h reminder, outside a 6h one
        Interview day = interview(5, "America/Denver", LocalDateTime.of(2026, 10, 7, 10, 30), 24);
        Interview sixHours = interview(6, "America/Denver", LocalDateTime.of(2026, 10, 7, 10, 30), 6);
        candidates(day, sixHours);

        scheduler.sendPendingReminders();

        assertThat(day.isReminderSent()).isTrue();
        assertThat(sixHours.isReminderSent()).isFalse();
    }

    @Test
    void userWithoutZoneFallsBackToServerZone() {
        // Server zone here is UTC: 2:15am Oct 7 UTC is 30 minutes away
        Interview noZone = interview(7, null, LocalDateTime.of(2026, 10, 7, 2, 15), 1);
        candidates(noZone);

        scheduler.sendPendingReminders();

        assertThat(noZone.isReminderSent()).isTrue();
    }

    @Test
    void emailFailure_isRetriedNextCycle() {
        Interview denver = interview(1, "America/Denver", LocalDateTime.of(2026, 10, 6, 20, 30), 1);
        candidates(denver);
        doThrow(new RuntimeException("SMTP error")).when(emailService)
            .sendInterviewReminder(any(), any(), any(), any(), any(), any());

        scheduler.sendPendingReminders();

        assertThat(denver.isReminderSent()).isFalse();
    }

    @Test
    void noCandidates_sendsNothing() {
        when(interviewRepository.findPendingRemindersBetween(any(), any())).thenReturn(Collections.emptyList());

        scheduler.sendPendingReminders();

        verifyNoInteractions(emailService);
    }
}
