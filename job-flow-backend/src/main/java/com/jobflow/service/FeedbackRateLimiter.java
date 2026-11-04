package com.jobflow.service;

import com.jobflow.exception.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * A few feedback messages per IP per hour.
 *
 * The general API limiter allows 60 requests a minute, which is fine for normal use but
 * would let one person send thousands of feedback emails a day. The IP comes from
 * getRemoteAddr(), which Tomcat only rewrites for trusted proxies, so it can't be spoofed.
 */
@Component
public class FeedbackRateLimiter {

    static final long WINDOW_MS = 60 * 60 * 1000L;

    private final int maxPerWindow;
    private final LongSupplier clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public FeedbackRateLimiter(@Value("${app.feedback.per-ip-hourly-limit:5}") int maxPerWindow) {
        this(maxPerWindow, System::currentTimeMillis);
    }

    FeedbackRateLimiter(int maxPerWindow, LongSupplier clock) {
        this.maxPerWindow = maxPerWindow;
        this.clock = clock;
    }

    /** Counts one message from this IP, or throws 429 if it's already used up this hour. */
    public void check(String ip) {
        long now = clock.getAsLong();
        Window window = windows.compute(ip, (k, existing) -> {
            if (existing == null || isExpired(existing, now)) {
                return new Window(now, 1);
            }
            existing.count++;
            return existing;
        });
        if (window.count > maxPerWindow) {
            long minutes = Math.max(1, (window.start + WINDOW_MS - now + 59_999) / 60_000);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "FEEDBACK_RATE_LIMITED",
                    "You've sent a lot of feedback. Please try again in " + minutes + " minutes.",
                    Map.of("minutes", minutes));
        }
    }

    // Finished windows are dropped so the map can't grow forever
    @Scheduled(fixedRate = 10 * 60 * 1000L)
    void evictExpired() {
        long now = clock.getAsLong();
        windows.entrySet().removeIf(e -> isExpired(e.getValue(), now));
    }

    int size() {
        return windows.size();
    }

    private static boolean isExpired(Window window, long now) {
        return now - window.start >= WINDOW_MS;
    }

    private static class Window {
        // volatile: written inside compute(), read by the eviction job on another thread
        volatile long start;
        volatile int count;

        Window(long start, int count) {
            this.start = start;
            this.count = count;
        }
    }
}
