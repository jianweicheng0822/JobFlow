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

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import com.jobflow.exception.ApiException;
import java.util.Map;
import java.util.stream.Collectors;

import static com.jobflow.util.TextUtils.blankToNull;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;
    private final UserClock userClock;

    public List<InterviewDTO> findAll(Long userId) {
        return interviewRepository.findByJobApplicationUserId(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO findById(Long userId, Long id) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> NotFoundException.interview(id));
        return toDTO(interview);
    }

    public List<InterviewDTO> findUpcoming(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> NotFoundException.user());
        // Interview times are the user's local wall-clock time, so compare with their "now"
        return interviewRepository
            .findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(userId, userClock.now(user))
            .stream()
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
        LocalDate today = userClock.today(app.getUser());
        long daysUntil = ChronoUnit.DAYS.between(today, interview.getInterviewDate().toLocalDate());
        return InterviewDTO.builder()
            .id(interview.getId())
            .jobApplicationId(app.getId())
            .positionTitle(app.getPositionTitle())
            .companyName(app.getCompany().getName())
            .interviewDate(interview.getInterviewDate())
            .interviewType(interview.getInterviewType())
            .notes(interview.getNotes())
            .reminderEnabled(interview.isReminderEnabled())
            .reminderHoursBefore(interview.getReminderHoursBefore())
            .reminderSent(interview.isReminderSent())
            .daysUntil(daysUntil)
            .build();
    }
}
