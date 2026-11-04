package com.jobflow.service;

import com.jobflow.dto.FeedbackRequest;
import com.jobflow.exception.ApiException;
import com.jobflow.model.Feedback;
import com.jobflow.model.User;
import com.jobflow.repository.FeedbackRepository;
import com.jobflow.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Saves messages from the feedback form.
 *
 * Three layers keep it from being abused, cheapest first: a honeypot field for dumb bots,
 * a per-IP hourly limit, and a site-wide daily cap counted in the database (so restarts
 * don't reset it and rotating IPs doesn't get around it). Saved messages are then emailed
 * out by FeedbackNotifier when that's configured.
 */
@Service
@Slf4j
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final FeedbackRateLimiter rateLimiter;
    private final UserClock userClock;
    private final FeedbackNotifier notifier;
    private final int dailyLimit;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           UserRepository userRepository,
                           FeedbackRateLimiter rateLimiter,
                           UserClock userClock,
                           FeedbackNotifier notifier,
                           @Value("${app.feedback.daily-limit:200}") int dailyLimit) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
        this.userClock = userClock;
        this.notifier = notifier;
        this.dailyLimit = dailyLimit;
    }

    /**
     * Save a validated request and queue its email. Returns the saved row, or null when it was dropped as a bot
     * (the caller answers the same either way, so bots can't tell).
     *
     * @param userId null when the sender isn't logged in
     */
    public Feedback submit(FeedbackRequest request, Long userId, String ip, String userAgent) {
        if (request.isFromBot()) {
            // Logged so a real person whose browser autofilled the hidden field doesn't vanish silently
            log.info("Dropped feedback from {}: honeypot field was filled in", ip);
            return null;
        }
        rateLimiter.check(ip);

        // Loaded for real (not a lazy reference): the email is built from it after this returns
        User user = userId == null ? null : userRepository.findById(userId).orElse(null);

        LocalDateTime now = userClock.nowUtc();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        if (feedbackRepository.countByCreatedAtGreaterThanEqual(startOfDay) >= dailyLimit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "FEEDBACK_CLOSED_TODAY",
                    "Feedback is closed for today. Please try again tomorrow.", Map.of());
        }

        Feedback feedback = Feedback.builder()
                .type(request.getType())
                .message(request.getMessage().strip())
                .email(blankToNull(request.getEmail()))
                .user(user)
                .pageUrl(truncate(request.getPageUrl(), Feedback.PAGE_URL_MAX))
                .userAgent(truncate(userAgent, Feedback.USER_AGENT_MAX))
                .createdAt(now)
                .build();
        feedbackRepository.save(feedback);
        notifier.notifyNew(feedback);
        return feedback;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    static String truncate(String s, int max) {
        String value = blankToNull(s);
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
