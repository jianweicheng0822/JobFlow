package com.jobflow.service;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.exception.NotFoundException;
import com.jobflow.model.*;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import com.jobflow.exception.ApiException;

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

    @Mock
    private UserRepository userRepository;

    // Real clock in the server's zone, so existing "today" expectations hold; tests can stub it
    @Spy
    private UserClock userClock = new UserClock();

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
                .isInstanceOf(ApiException.class)
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

    // --- input validation ---

    @Test
    void create_missingRequiredFields_throwsClearMessages() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        assertThatThrownBy(() -> interviewService.create(1L, request))
                .isInstanceOf(ApiException.class)
                .hasMessage("Job application is required");

        request.setJobApplicationId(10L);
        assertThatThrownBy(() -> interviewService.create(1L, request))
                .isInstanceOf(ApiException.class)
                .hasMessage("Interview date is required");

        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        assertThatThrownBy(() -> interviewService.create(1L, request))
                .isInstanceOf(ApiException.class)
                .hasMessage("Interview type is required");

        verifyNoInteractions(interviewRepository);
    }

    // --- "now" and "today" follow the user's time zone ---

    private Interview at(long id, LocalDateTime wallClock, String zone) {
        return Interview.builder().id(id).jobApplication(testApp)
                .interviewDate(wallClock).timeZone(zone).interviewType(InterviewType.VIDEO).build();
    }

    @Test
    void findUpcoming_checksEachInterviewOnItsOwnClock() {
        // 01:45 UTC Oct 7 = 9:45am Shanghai = 6:45pm Oct 6 Los Angeles
        testApp.getUser().setTimeZone("Asia/Shanghai");
        doReturn(Instant.parse("2026-10-07T01:45:00Z")).when(userClock).instant();
        LocalDateTime utcNow = LocalDateTime.of(2026, 10, 7, 1, 45);
        doReturn(utcNow).when(userClock).nowUtc();
        when(userRepository.existsById(1L)).thenReturn(true);

        Interview laCall = at(1, LocalDateTime.of(2026, 10, 6, 19, 0), "America/Los_Angeles"); // 02:00 UTC
        Interview over = at(2, LocalDateTime.of(2026, 10, 7, 9, 0), "Asia/Shanghai");          // 01:00 UTC
        Interview soon = at(3, LocalDateTime.of(2026, 10, 7, 9, 50), "Asia/Shanghai");         // 01:50 UTC
        // The DB only gets a rough lower bound, a day back
        when(interviewRepository.findByJobApplicationUserIdAndInterviewDateAfterOrderByInterviewDateAsc(1L, utcNow.minusDays(1)))
                .thenReturn(List.of(laCall, over, soon));

        List<InterviewDTO> result = interviewService.findUpcoming(1L);

        // Sorted by when they actually happen, not by the clock time written down
        assertThat(result).extracting(InterviewDTO::getId).containsExactly(3L, 1L);
        assertThat(result.get(1).getStartsAt()).isEqualTo(OffsetDateTime.parse("2026-10-06T19:00-07:00"));
        assertThat(result.get(1).getTimeZone()).isEqualTo("America/Los_Angeles");
    }

    @Test
    void daysUntil_usesTheUsersCalendar() {
        // 10pm Oct 14 in Los Angeles is already Oct 15 in Shanghai
        testApp.getUser().setTimeZone("Asia/Shanghai");
        doReturn(LocalDate.of(2030, 10, 14)).when(userClock).today(testApp.getUser());
        when(interviewRepository.findByJobApplicationUserId(1L))
                .thenReturn(List.of(at(1, LocalDateTime.of(2030, 10, 14, 22, 0), "America/Los_Angeles")));

        assertThat(interviewService.findAll(1L).get(0).getDaysUntil()).isEqualTo(1);
    }

    @Test
    void create_withoutZone_pinsTheUsersZone() {
        testApp.getUser().setTimeZone("Asia/Shanghai");
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.PHONE);
        when(jobApplicationRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testApp));
        when(interviewRepository.save(any(Interview.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(interviewService.create(1L, request).getTimeZone()).isEqualTo("Asia/Shanghai");

        request.setTimeZone("America/New_York");
        assertThat(interviewService.create(1L, request).getTimeZone()).isEqualTo("America/New_York");
    }

    @Test
    void create_unknownZone_isRejected() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.PHONE);
        request.setTimeZone("Mars/Olympus");
        when(jobApplicationRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testApp));

        assertThatThrownBy(() -> interviewService.create(1L, request))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "UNKNOWN_TIME_ZONE");
    }

    @Test
    void update_movingToAnotherZone_resetsTheReminder() {
        testInterview.setTimeZone("Asia/Shanghai");
        testInterview.setReminderEnabled(true);
        testInterview.setReminderSent(true);
        when(interviewRepository.findByIdAndJobApplicationUserId(100L, 1L)).thenReturn(Optional.of(testInterview));
        when(interviewRepository.save(any(Interview.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setTimeZone("America/Los_Angeles");
        InterviewDTO result = interviewService.update(1L, 100L, request);

        assertThat(result.getTimeZone()).isEqualTo("America/Los_Angeles");
        assertThat(result.isReminderSent()).isFalse();
    }

    @Test
    void daysUntil_countsFromTheUsersToday() {
        doReturn(LocalDate.of(2030, 6, 14)).when(userClock).today(testApp.getUser());
        when(interviewRepository.findByJobApplicationUserId(1L)).thenReturn(List.of(testInterview));

        // Interview is on 2030-06-15
        assertThat(interviewService.findAll(1L).get(0).getDaysUntil()).isEqualTo(1);
    }

    @Test
    void findUpcoming_unknownUser_throws() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> interviewService.findUpcoming(99L)).isInstanceOf(NotFoundException.class);
    }

    // --- error codes ---

    @Test
    void invalidReminderHours_listsTheAllowedValues() {
        CreateInterviewRequest request = new CreateInterviewRequest();
        request.setJobApplicationId(10L);
        request.setInterviewDate(LocalDateTime.of(2030, 7, 1, 14, 0));
        request.setInterviewType(InterviewType.ONSITE);
        request.setReminderHoursBefore(5);

        assertThatThrownBy(() -> interviewService.create(1L, request))
                .hasFieldOrPropertyWithValue("code", "INVALID_REMINDER_HOURS")
                .hasFieldOrPropertyWithValue("params", java.util.Map.of("allowed", "1, 6, 24"));
    }

    @Test
    void missingInterview_hasCodeAndId() {
        when(interviewRepository.findByIdAndJobApplicationUserId(7L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewService.findById(1L, 7L))
                .hasFieldOrPropertyWithValue("code", "INTERVIEW_NOT_FOUND")
                .hasFieldOrPropertyWithValue("params", java.util.Map.of("id", 7L));
    }
}
