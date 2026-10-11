package com.jobflow.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    static final int DEFAULT_MAX_REQUESTS = 60;
    private static final long WINDOW_MS = 60_000; // 1 minute

    // Per user (or IP) per window. Only raised for load testing, where one k6 user
    // fires far more than a real person would.
    private final int maxRequests;

    private final ConcurrentHashMap<String, RequestBucket> buckets = new ConcurrentHashMap<>();

    public RateLimitInterceptor() {
        this(DEFAULT_MAX_REQUESTS);
    }

    @Autowired
    public RateLimitInterceptor(@Value("${app.rate-limit.max-requests:60}") int maxRequests) {
        this.maxRequests = maxRequests;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String key = resolveKey(request);
        long now = System.currentTimeMillis();
        RequestBucket bucket = buckets.compute(key, (k, existing) -> {
            if (existing == null || isExpired(existing, now)) {
                return new RequestBucket(now, 1);
            }
            existing.count++;
            return existing;
        });

        if (bucket.count > maxRequests) {
            long retryAfterSeconds = Math.max(1, (bucket.windowStart + WINDOW_MS - now + 999) / 1000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setContentType("application/json");
            // Same shape as GlobalExceptionHandler so the frontend can show "message"
            response.getWriter().write("{\"timestamp\":\"" + LocalDateTime.now()
                    + "\",\"status\":429,\"error\":\"Too Many Requests\","
                    + "\"message\":\"Too many requests. Please wait " + retryAfterSeconds + " seconds and try again.\","
                    + "\"code\":\"RATE_LIMITED\",\"params\":{\"seconds\":" + retryAfterSeconds + "}}");
            return false;
        }

        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequests));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, maxRequests - bucket.count)));
        return true;
    }

    // Drop finished windows so the map can't grow forever (e.g. from many different IPs)
    @Scheduled(fixedRate = WINDOW_MS)
    void evictExpiredBuckets() {
        evictExpiredBuckets(System.currentTimeMillis());
    }

    void evictExpiredBuckets(long now) {
        buckets.entrySet().removeIf(entry -> isExpired(entry.getValue(), now));
    }

    int bucketCount() {
        return buckets.size();
    }

    private static boolean isExpired(RequestBucket bucket, long now) {
        return now - bucket.windowStart > WINDOW_MS;
    }

    private String resolveKey(HttpServletRequest request) {
        // Use the authenticated user if there is one, otherwise the client IP.
        // getRemoteAddr() is the real client: X-Forwarded-For is only applied by Tomcat
        // (server.forward-headers-strategy=native) when the request comes from a trusted
        // proxy, so clients can't pick their own IP by sending that header.
        String user = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : null;
        if (user != null) return "user:" + user;
        return "ip:" + request.getRemoteAddr();
    }

    private static class RequestBucket {
        // volatile: written inside compute(), read by the eviction job on another thread
        volatile long windowStart;
        volatile int count;

        RequestBucket(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
