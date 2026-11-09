package com.jobflow.service;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.model.Interview;
import com.jobflow.model.JobApplication;
import com.jobflow.model.User;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import com.jobflow.exception.ApiException;
import java.util.Map;
import java.util.stream.Collectors;

import static com.jobflow.util.TextUtils.blankToNull;

// toDTO reads the application's user and company, which are lazy, so every method
// needs an open session (open-in-view is off)
@Service
@RequiredArgsConstructor
@Transactional
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;
    private final UserClock userClock;

    @Transactional(readOnly = true)
    public List<InterviewDTO> findAll(Long userId) {
        return interviewRepository.findByJobApplicationUserId(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    @Transactional(readOnly = true)
    public InterviewDTO findById(Long userId, Long id) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> NotFoundException.interview(id));
        return toDTO(interview);
    }

    @Transactional(readOnly = true)
    public List<InterviewDTO> findUpcoming(Long userId) {
        if (!userRepository.existsById(userId)) throw NotFoundException.user();
        // Each interview's time is on its own zone's clock, and every clock is within
        // 14h of UTC. So ask the DB for anything later than a day ago in UTC, then
        // keep the ones that really haven't started yet.
        Instant now = userClock.instant();
        return interviewRepository
            .findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(userId, userClock.nowUtc().minusDays(1))
            .stream()
            .filter(interview -> userClock.startOf(interview).toInstant().isAfter(now))
            .sorted(Comparator.comparing((Interview interview) -> userClock.startOf(interview).toInstant()))
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO create(Long userId, CreateInterviewRequest request) {
        // Required on create only; update is partial so these can be null there
        if (request.getJobApplicationId() == null) {
            throw ApiException.badRequest("INTERVIEW_APPLICATION_REQUIRED", "Job application is required");
        }
        if (request.getInterviewDate() == null) {
            throw ApiException.badRequest("INTERVIEW_DATE_REQUIRED", "Interview date is required");
        }
        if (request.getInterviewType() == null) {
            throw ApiException.badRequest("INTERVIEW_TYPE_REQUIRED", "Interview type is required");
        }
        if (request.getReminderHoursBefore() != null) {
            validateReminderHours(request.getReminderHoursBefore());
        }

        JobApplication app = jobApplicationRepository.findByIdAndUserId(request.getJobApplicationId(), userId)
            .orElseThrow(() -> NotFoundException.application(request.getJobApplicationId()));

        Interview interview = Interview.builder()
            .jobApplication(app)
            .interviewDate(request.getInterviewDate())
            // Pinned on create, so changing the zone in Settings later doesn't move it
            .timeZone(request.getTimeZone() != null
                ? UserClock.requireValidZone(request.getTimeZone())
                : app.getUser().getTimeZone())
            .interviewType(request.getInterviewType())
            .notes(blankToNull(request.getNotes()))
            .reminderEnabled(request.getReminderEnabled() != null && request.getReminderEnabled())
            .reminderHoursBefore(request.getReminderHoursBefore() != null ? request.getReminderHoursBefore() : 24)
            .build();
        return toDTO(interviewRepository.save(interview));
    }

    public InterviewDTO update(Long userId, Long id, CreateInterviewRequest request) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> NotFoundException.interview(id));

        if (request.getJobApplicationId() != null) {
            JobApplication app = jobApplicationRepository.findByIdAndUserId(request.getJobApplicationId(), userId)
                .orElseThrow(() -> NotFoundException.application(request.getJobApplicationId()));
            interview.setJobApplication(app);
        }
        boolean shouldResetReminder = false;
        if (request.getInterviewDate() != null) {
            if (!request.getInterviewDate().equals(interview.getInterviewDate())) {
                shouldResetReminder = true;
            }
            interview.setInterviewDate(request.getInterviewDate());
        }
        if (request.getTimeZone() != null) {
            String zone = UserClock.requireValidZone(request.getTimeZone());
            // Same clock time in another zone is a different moment
            if (!zone.equals(userClock.zoneOfInterview(interview).getId())) {
                shouldResetReminder = true;
            }
            interview.setTimeZone(zone);
        }
        if (request.getInterviewType() != null) interview.setInterviewType(request.getInterviewType());
        if (request.getNotes() != null) interview.setNotes(blankToNull(request.getNotes()));
        if (request.getReminderEnabled() != null) {
            if (request.getReminderEnabled() != interview.isReminderEnabled()) {
                shouldResetReminder = true;
            }
            interview.setReminderEnabled(request.getReminderEnabled());
        }
        if (request.getReminderHoursBefore() != null) {
            validateReminderHours(request.getReminderHoursBefore());
            if (request.getReminderHoursBefore() != interview.getReminderHoursBefore()) {
                shouldResetReminder = true;
            }
            interview.setReminderHoursBefore(request.getReminderHoursBefore());
        }
        if (shouldResetReminder) {
            interview.setReminderSent(false);
        }

        return toDTO(interviewRepository.save(interview));
    }

    public void delete(Long userId, Long id) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> NotFoundException.interview(id));
        interviewRepository.delete(interview);
    }

    private static final Set<Integer> ALLOWED_REMINDER_HOURS = Set.of(1, 6, 24);

    private void validateReminderHours(int hours) {
        if (!ALLOWED_REMINDER_HOURS.contains(hours)) {
            throw ApiException.badRequest("INVALID_REMINDER_HOURS", "reminderHoursBefore must be one of " + ALLOWED_REMINDER_HOURS,
                Map.of("allowed", ALLOWED_REMINDER_HOURS.stream().sorted().map(String::valueOf).collect(Collectors.joining(", "))));
        }
    }

    private InterviewDTO toDTO(Interview interview) {
        JobApplication app = interview.getJobApplication();
        User user = app.getUser();
        ZonedDateTime start = userClock.startOf(interview);
        // Counted in calendar days on the user's clock, not the interview's
        LocalDate startDay = start.withZoneSameInstant(userClock.zoneOf(user)).toLocalDate();
        long daysUntil = ChronoUnit.DAYS.between(userClock.today(user), startDay);
        return InterviewDTO.builder()
            .id(interview.getId())
            .jobApplicationId(app.getId())
            .positionTitle(app.getPositionTitle())
            .companyName(app.getCompany().getName())
            .interviewDate(interview.getInterviewDate())
            .timeZone(start.getZone().getId())
            .startsAt(start.toOffsetDateTime())
            .interviewType(interview.getInterviewType())
            .notes(interview.getNotes())
            .reminderEnabled(interview.isReminderEnabled())
            .reminderHoursBefore(interview.getReminderHoursBefore())
            .reminderSent(interview.isReminderSent())
            .daysUntil(daysUntil)
            .build();
    }
}
