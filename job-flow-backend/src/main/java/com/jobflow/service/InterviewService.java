package com.jobflow.service;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.model.Interview;
import com.jobflow.model.JobApplication;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public List<InterviewDTO> findAll() {
        return interviewRepository.findAll().stream()
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO findById(Long id) {
        Interview interview = interviewRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Interview not found: " + id));
        return toDTO(interview);
    }

    public List<InterviewDTO> findUpcoming() {
        return interviewRepository.findByInterviewDateAfterOrderByInterviewDateAsc(LocalDateTime.now())
            .stream()
            .map(this::toDTO)
            .toList();
    }

    public InterviewDTO create(CreateInterviewRequest request) {
        JobApplication app = jobApplicationRepository.findById(request.getJobApplicationId())
            .orElseThrow(() -> new RuntimeException("Job application not found: " + request.getJobApplicationId()));

        Interview interview = Interview.builder()
            .jobApplication(app)
            .interviewDate(request.getInterviewDate())
            .interviewType(request.getInterviewType())
            .notes(request.getNotes())
            .build();
        return toDTO(interviewRepository.save(interview));
    }

    public InterviewDTO update(Long id, CreateInterviewRequest request) {
        Interview interview = interviewRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Interview not found: " + id));

        if (request.getJobApplicationId() != null) {
            JobApplication app = jobApplicationRepository.findById(request.getJobApplicationId())
                .orElseThrow(() -> new RuntimeException("Job application not found: " + request.getJobApplicationId()));
            interview.setJobApplication(app);
        }
        if (request.getInterviewDate() != null) interview.setInterviewDate(request.getInterviewDate());
        if (request.getInterviewType() != null) interview.setInterviewType(request.getInterviewType());
        if (request.getNotes() != null) interview.setNotes(request.getNotes());

        return toDTO(interviewRepository.save(interview));
    }

    public void delete(Long id) {
        interviewRepository.deleteById(id);
    }

    private InterviewDTO toDTO(Interview interview) {
        JobApplication app = interview.getJobApplication();
        return InterviewDTO.builder()
            .id(interview.getId())
            .jobApplicationId(app.getId())
            .positionTitle(app.getPositionTitle())
            .companyName(app.getCompany().getName())
            .interviewDate(interview.getInterviewDate())
            .interviewType(interview.getInterviewType())
            .notes(interview.getNotes())
            .build();
    }
}