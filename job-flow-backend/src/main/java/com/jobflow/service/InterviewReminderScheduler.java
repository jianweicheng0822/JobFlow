package com.jobflow.service;

import com.jobflow.model.Interview;
import com.jobflow.model.JobApplication;
import com.jobflow.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InterviewReminderScheduler {

    private final InterviewRepository interviewRepository;
    private final EmailService emailService;

    @Scheduled(fixedRate = 600_000) // every 10 minutes
    @Transactional
    public void sendPendingReminders() {
        List<Interview> interviews = interviewRepository.findInterviewsNeedingReminder();
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
}
