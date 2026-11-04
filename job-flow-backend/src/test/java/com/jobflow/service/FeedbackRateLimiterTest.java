package com.jobflow.service;

import com.jobflow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FeedbackRateLimiterTest {

    private final AtomicLong now = new AtomicLong(1_000_000L);
    private final FeedbackRateLimiter limiter = new FeedbackRateLimiter(3, now::get);

    @Test
    void allowsUpToTheLimit_thenRefusesWith429() {
        for (int i = 0; i < 3; i++) {
            assertThatCode(() -> limiter.check("1.2.3.4")).doesNotThrowAnyException();
        }

        assertThatThrownBy(() -> limiter.check("1.2.3.4"))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(e.getCode()).isEqualTo("FEEDBACK_RATE_LIMITED");
                    assertThat(e.getParams()).containsEntry("minutes", 60L);
                });
    }

    @Test
    void ipsAreCountedSeparately() {
        for (int i = 0; i < 3; i++) limiter.check("1.2.3.4");

        assertThatCode(() -> limiter.check("5.6.7.8")).doesNotThrowAnyException();
    }

    @Test
    void windowResetsAfterAnHour() {
        for (int i = 0; i < 3; i++) limiter.check("1.2.3.4");
        assertThatThrownBy(() -> limiter.check("1.2.3.4")).isInstanceOf(ApiException.class);

        now.addAndGet(FeedbackRateLimiter.WINDOW_MS);

        assertThatCode(() -> limiter.check("1.2.3.4")).doesNotThrowAnyException();
    }

    @Test
    void retryMinutesCountDown() {
        for (int i = 0; i < 3; i++) limiter.check("1.2.3.4");
        now.addAndGet(45 * 60_000L);

        assertThatThrownBy(() -> limiter.check("1.2.3.4"))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getParams()).containsEntry("minutes", 15L));
    }

    @Test
    void evictExpired_dropsOnlyFinishedWindows() {
        limiter.check("1.2.3.4");
        now.addAndGet(30 * 60_000L);
        limiter.check("5.6.7.8");
        now.addAndGet(31 * 60_000L);

        limiter.evictExpired();

        assertThat(limiter.size()).isEqualTo(1);
    }
}
