package com.jobflow.service;

import com.jobflow.model.Interview;
import com.jobflow.model.JobApplication;
import com.jobflow.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InterviewReminderScheduler {

    private final InterviewRepository interviewRepository;
    private final EmailService emailService;
    private final UserClock userClock;

    @Scheduled(fixedRate = 600_000) // every 10 minutes
    @Transactional
    public void sendPendingReminders() {
        // Every zone is within +-14h of UTC and reminders go out at most 24h early, so
        // [-1 day, +2 days] around UTC now catches anything that could be due anywhere
        LocalDateTime utcNow = userClock.nowUtc();
        List<Interview> interviews = interviewRepository
            .findPendingRemindersBetween(utcNow.minusDays(1), utcNow.plusDays(2))
            .stream()
            .filter(this::isDue)
            .toList();
        if (interviews.isEmpty()) {
            log.debug("No interview reminders to send");
            return;
        }

        log.info("Found {} interview reminder(s) to send", interviews.size());
        for (Interview interview : interviews) {
            try {
                JobApplication app = interview.getJobApplication();
                String userEmail = app.getUser().getEmail();

                emailService.sendInterviewReminder(
                    userEmail,
                    app.getCompany().getName(),
                    app.getPositionTitle(),
                    interview.getInterviewDate(),
                    interview.getInterviewType().name(),
                    interview.getNotes()
                );
                interview.setReminderSent(true);
            } catch (Exception e) {
                log.error("Failed to send reminder for interview {}, will retry next cycle",
                    interview.getId(), e);
            }
        }
    }

    // Due when the interview hasn't started yet on the user's clock and is within
    // their chosen number of hours
    private boolean isDue(Interview interview) {
        LocalDateTime usersNow = userClock.now(interview.getJobApplication().getUser());
        LocalDateTime start = interview.getInterviewDate();
        return start.isAfter(usersNow) && !start.isAfter(usersNow.plusHours(interview.getReminderHoursBefore()));
    }
}
