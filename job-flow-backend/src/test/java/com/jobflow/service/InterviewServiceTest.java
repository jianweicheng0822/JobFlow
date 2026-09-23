package com.jobflow.service;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.model.*;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @InjectMocks
    private InterviewService interviewService;

    private Company testCompany;
    private JobApplication testApp;
    private Interview testInterview;

    @BeforeEach
    void setUp() {
        testCompany = Company.builder()
                .id(1L)
                .name("TestCorp")
                .build();

        testApp = JobApplication.builder()
                .id(10L)
                .positionTitle("Engineer")
                .company(testCompany)
                .user(User.builder().id(1L).build())
                .status(ApplicationStatus.APPLIED)
                .build();

        testInterview = Interview.builder()
                .id(100L)
                .jobApplication(testApp)
                .interviewDate(LocalDateTime.of(2030, 6, 15, 10, 0))
                .interviewType(InterviewType.PHONE)
                .notes("Initial screen")
                .build();
    }

    @Test
    void findAll_returnsDTOs() {
        when(interviewRepository.findByJobApplicationUserId(1L))
                .thenReturn(List.of(testInterview));

        List<InterviewDTO> result = interviewService.findAll(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(100L);
        assertThat(result.get(0).getJobApplicationId()).isEqualTo(10L);
        assertThat(result.get(0).getPositionTitle()).isEqualTo("Engineer");
        assertThat(result.get(0).getCompanyName()).isEqualTo("TestCorp");
        assertThat(result.get(0).getInterviewType()).isEqualTo(InterviewType.PHONE);
        assertThat(result.get(0).getNotes()).isEqualTo("Initial screen");
    }

    @Test
    void findById_notFound_throwsException() {
        when(interviewRepository.findByIdAndJobApplicationUserId(999L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewService.findById(1L, 999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Interview not found");
    }

    @Test
    void create_savesAndReturnsDTO() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.ONSITE);
        request.setNotes("On-site round");

        when(jobApplicationRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(testApp));
        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview saved = invocation.getArgument(0);
                    saved.setId(101L);
                    return saved;
                });

        InterviewDTO result = interviewService.create(1L, request);

        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getJobApplicationId()).isEqualTo(10L);
        assertThat(result.getInterviewType()).isEqualTo(InterviewType.ONSITE);
        assertThat(result.getNotes()).isEqualTo("On-site round");

        verify(interviewRepository).save(any(Interview.class));
    }

    @Test
    void create_withReminder_savesReminderFields() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.ONSITE);
        request.setNotes("On-site round");
        request.setReminderEnabled(true);
        request.setReminderHoursBefore(6);

        when(jobApplicationRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(testApp));
        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview saved = invocation.getArgument(0);
                    saved.setId(102L);
                    return saved;
                });

        InterviewDTO result = interviewService.create(1L, request);

        assertThat(result.isReminderEnabled()).isTrue();
        assertThat(result.getReminderHoursBefore()).isEqualTo(6);
        assertThat(result.isReminderSent()).isFalse();
    }

    @Test
    void create_withInvalidReminderHours_throwsException() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.ONSITE);
        request.setReminderHoursBefore(3);

        assertThatThrownBy(() -> interviewService.create(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("reminderHoursBefore");
    }

    @Test
    void update_reminderSettingsChanged_resetsReminderSent() {
        testInterview.setReminderEnabled(true);
        testInterview.setReminderHoursBefore(24);
        testInterview.setReminderSent(true);

        when(interviewRepository.findByIdAndJobApplicationUserId(100L, 1L))
                .thenReturn(Optional.of(testInterview));
        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setReminderHoursBefore(6);

        InterviewDTO result = interviewService.update(1L, 100L, request);

        assertThat(result.getReminderHoursBefore()).isEqualTo(6);
        assertThat(result.isReminderSent()).isFalse();
    }

    @Test
    void delete_notOwned_throwsException() {
        when(interviewRepository.findByIdAndJobApplicationUserId(100L, 2L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewService.delete(2L, 100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Interview not found");

        verify(interviewRepository, never()).delete(any());
    }
}
