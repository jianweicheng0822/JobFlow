package com.jobflow.service;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.model.Interview;
import com.jobflow.model.JobApplication;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public List<InterviewDTO> findAll(Long userId) {
        return interviewRepository.findByJobApplicationUserId(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO findById(Long userId, Long id) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        return toDTO(interview);
    }

    public List<InterviewDTO> findUpcoming(Long userId) {
        return interviewRepository
            .findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(userId, LocalDateTime.now())
            .stream()
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO create(Long userId, CreateInterviewRequest request) {
        if (request.getReminderHoursBefore() != null) {
            validateReminderHours(request.getReminderHoursBefore());
        }

        JobApplication app = jobApplicationRepository.findByIdAndUserId(request.getJobApplicationId(), userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + request.getJobApplicationId()));

        Interview interview = Interview.builder()
            .jobApplication(app)
            .interviewDate(request.getInterviewDate())
            .interviewType(request.getInterviewType())
            .notes(request.getNotes())
            .reminderEnabled(request.getReminderEnabled() != null && request.getReminderEnabled())
            .reminderHoursBefore(request.getReminderHoursBefore() != null ? request.getReminderHoursBefore() : 24)
            .build();
        return toDTO(interviewRepository.save(interview));
    }

    public InterviewDTO update(Long userId, Long id, CreateInterviewRequest request) {
        Interview interview = interviewRepository.findByIdAndJobApplicationUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Interview not found: " + id));

        if (request.getJobApplicationId() != null) {
            JobApplication app = jobApplicationRepository.findByIdAndUserId(request.getJobApplicationId(), userId)
                .orElseThrow(() -> new NotFoundException("Job application not found: " + request.getJobApplicationId()));
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
        if (request.getNotes() != null) interview.setNotes(request.getNotes());
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
            .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        interviewRepository.delete(interview);
    }

    private static final Set<Integer> ALLOWED_REMINDER_HOURS = Set.of(1, 6, 24);

    private void validateReminderHours(int hours) {
        if (!ALLOWED_REMINDER_HOURS.contains(hours)) {
            throw new IllegalArgumentException("reminderHoursBefore must be one of " + ALLOWED_REMINDER_HOURS);
        }
    }

    private InterviewDTO toDTO(Interview interview) {
        JobApplication app = interview.getJobApplication();
        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), interview.getInterviewDate().toLocalDate());
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
