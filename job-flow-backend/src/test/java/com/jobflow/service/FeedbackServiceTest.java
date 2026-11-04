package com.jobflow.service;

import com.jobflow.dto.FeedbackRequest;
import com.jobflow.exception.ApiException;
import com.jobflow.model.Feedback;
import com.jobflow.model.FeedbackType;
import com.jobflow.model.User;
import com.jobflow.repository.FeedbackRepository;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    // 2026-11-03 23:30 UTC, but 16:30 on the server's (Los Angeles) clock
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-03T23:30:00Z"), ZoneId.of("America/Los_Angeles"));

    @Mock
    private FeedbackRepository repository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FeedbackRateLimiter rateLimiter;

    @Mock
    private FeedbackNotifier notifier;

    private FeedbackService service;

    @BeforeEach
    void setUp() {
        service = new FeedbackService(repository, userRepository, rateLimiter, new UserClock(CLOCK), notifier, 3);
    }

    private static FeedbackRequest request(String message) {
        FeedbackRequest request = new FeedbackRequest();
        request.setType(FeedbackType.IDEA);
        request.setMessage(message);
        return request;
    }

    private Feedback savedFeedback() {
        ArgumentCaptor<Feedback> saved = ArgumentCaptor.forClass(Feedback.class);
        verify(repository).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void submit_trimsAndStoresFields() {
        when(repository.countByCreatedAtGreaterThanEqual(any())).thenReturn(0L);
        User user = User.builder().id(7L).email("alice@test.com").build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        FeedbackRequest request = request("  Add a calendar view  ");
        request.setEmail("  me@example.com ");
        request.setPageUrl("/dashboard");

        service.submit(request, 7L, "1.2.3.4", "UA/1");

        Feedback saved = savedFeedback();
        assertThat(saved.getType()).isEqualTo(FeedbackType.IDEA);
        assertThat(saved.getMessage()).isEqualTo("Add a calendar view");
        assertThat(saved.getEmail()).isEqualTo("me@example.com");
        assertThat(saved.getUser()).isSameAs(user);
        assertThat(saved.getPageUrl()).isEqualTo("/dashboard");
        assertThat(saved.getUserAgent()).isEqualTo("UA/1");
        assertThat(saved.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 11, 3, 23, 30));
        verify(rateLimiter).check("1.2.3.4");
        verify(notifier).notifyNew(saved);
    }

    @Test
    void submit_anonymousWithBlankOptionalFields_storesNulls() {
        when(repository.countByCreatedAtGreaterThanEqual(any())).thenReturn(0L);
        FeedbackRequest request = request("Broken page");
        request.setEmail("   ");
        request.setPageUrl("");

        service.submit(request, null, "1.2.3.4", null);

        Feedback saved = savedFeedback();
        assertThat(saved.getUser()).isNull();
        assertThat(saved.getEmail()).isNull();
        assertThat(saved.getPageUrl()).isNull();
        assertThat(saved.getUserAgent()).isNull();
    }

    @Test
    void submit_longPageUrlAndUserAgent_areTruncated() {
        when(repository.countByCreatedAtGreaterThanEqual(any())).thenReturn(0L);
        FeedbackRequest request = request("Broken page");
        request.setPageUrl("/" + "a".repeat(900));

        service.submit(request, null, "1.2.3.4", "U".repeat(900));

        Feedback saved = savedFeedback();
        assertThat(saved.getPageUrl()).hasSize(Feedback.PAGE_URL_MAX);
        assertThat(saved.getUserAgent()).hasSize(Feedback.USER_AGENT_MAX);
    }

    @Test
    void submit_honeypotFilled_dropsWithoutCountingOrSaving() {
        FeedbackRequest request = request("Buy cheap stuff");
        request.setWebsite("https://spam.example");

        assertThat(service.submit(request, null, "1.2.3.4", "bot")).isNull();

        verifyNoInteractions(repository, rateLimiter, notifier);
    }

    @Test
    void submit_ipOverLimit_savesNothing() {
        doThrow(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "FEEDBACK_RATE_LIMITED", "slow down", null))
                .when(rateLimiter).check("1.2.3.4");

        assertThatThrownBy(() -> service.submit(request("Broken page"), null, "1.2.3.4", null))
                .isInstanceOf(ApiException.class);
        verify(repository, never()).save(any());
        verify(notifier, never()).notifyNew(any());
    }

    @Test
    void submit_dailyCapReached_throwsAndSavesNothing() {
        when(repository.countByCreatedAtGreaterThanEqual(any())).thenReturn(3L);

        assertThatThrownBy(() -> service.submit(request("Broken page"), null, "1.2.3.4", null))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(e.getCode()).isEqualTo("FEEDBACK_CLOSED_TODAY");
                });
        verify(repository, never()).save(any());
        verify(notifier, never()).notifyNew(any());
    }

    @Test
    void submit_dailyCapCountsFromUtcMidnight_notTheServersMidnight() {
        when(repository.countByCreatedAtGreaterThanEqual(any())).thenReturn(0L);

        service.submit(request("Broken page"), null, "1.2.3.4", null);

        verify(repository).countByCreatedAtGreaterThanEqual(LocalDateTime.of(2026, 11, 3, 0, 0));
    }
}
