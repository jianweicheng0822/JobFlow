package com.jobflow.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitInterceptorTest {

    private RateLimitInterceptor interceptor;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        interceptor = new RateLimitInterceptor();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @Test
    void firstRequest_allowed() throws Exception {
        request.setRemoteAddr("192.168.1.1");

        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    @Test
    void setsRateLimitHeaders() throws Exception {
        request.setRemoteAddr("10.0.0.1");

        interceptor.preHandle(request, response, new Object());

        assertThat(response.getHeader("X-RateLimit-Limit")).isEqualTo("60");
        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("59");
    }

    @Test
    void remainingDecrementsWithEachRequest() throws Exception {
        request.setRemoteAddr("10.0.0.2");

        for (int i = 0; i < 5; i++) {
            response = new MockHttpServletResponse();
            interceptor.preHandle(request, response, new Object());
        }

        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("55");
    }

    @Test
    void exceedsLimit_returns429() throws Exception {
        request.setRemoteAddr("10.0.0.3");

        // Send 60 allowed requests
        for (int i = 0; i < 60; i++) {
            response = new MockHttpServletResponse();
            boolean allowed = interceptor.preHandle(request, response, new Object());
            assertThat(allowed).isTrue();
        }

        // 61st request should be blocked
        response = new MockHttpServletResponse();
        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        // Same JSON shape as other errors, so the frontend can show "message"
        assertThat(response.getContentAsString())
                .contains("\"status\":429")
                .contains("\"message\":\"Too many requests. Please wait ");
        assertThat(Integer.parseInt(response.getHeader("Retry-After"))).isBetween(1, 60);
    }

    @Test
    void differentIps_trackedSeparately() throws Exception {
        // Fill up IP1's bucket
        request.setRemoteAddr("1.1.1.1");
        for (int i = 0; i < 60; i++) {
            response = new MockHttpServletResponse();
            interceptor.preHandle(request, response, new Object());
        }

        // IP2 should still be allowed
        request.setRemoteAddr("2.2.2.2");
        response = new MockHttpServletResponse();
        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
    }

    @Test
    void authenticatedUser_usesUserKeyInsteadOfIp() throws Exception {
        request.setRemoteAddr("10.0.0.4");
        request.setUserPrincipal(() -> "alice@test.com");

        interceptor.preHandle(request, response, new Object());

        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("59");

        // Same user from different IP shares the same bucket
        request.setRemoteAddr("10.0.0.5");
        response = new MockHttpServletResponse();
        interceptor.preHandle(request, response, new Object());

        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("58");
    }

    @Test
    void xForwardedForHeader_cannotChangeTheBucket() throws Exception {
        // Tomcat's RemoteIpValve applies X-Forwarded-For for trusted proxies before we
        // get here; the header itself must never pick the bucket, or clients could rotate it
        for (int i = 0; i < 60; i++) {
            MockHttpServletRequest spoofed = new MockHttpServletRequest();
            spoofed.setRemoteAddr("10.0.0.9");
            spoofed.addHeader("X-Forwarded-For", "203.0.113." + i);
            interceptor.preHandle(spoofed, new MockHttpServletResponse(), new Object());
        }

        MockHttpServletRequest spoofed = new MockHttpServletRequest();
        spoofed.setRemoteAddr("10.0.0.9");
        spoofed.addHeader("X-Forwarded-For", "198.51.100.77");
        response = new MockHttpServletResponse();

        assertThat(interceptor.preHandle(spoofed, response, new Object())).isFalse();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    }

    @Test
    void remainingNeverGoesNegative() throws Exception {
        request.setRemoteAddr("10.0.0.99");

        // Send 61 requests
        for (int i = 0; i < 61; i++) {
            response = new MockHttpServletResponse();
            interceptor.preHandle(request, response, new Object());
        }

        // On the 60th request, remaining should be 0
        request.setRemoteAddr("10.0.0.98");
        for (int i = 0; i < 60; i++) {
            response = new MockHttpServletResponse();
            interceptor.preHandle(request, response, new Object());
        }
        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("0");
    }

    @Test
    void evictExpiredBuckets_dropsOnlyFinishedWindows() throws Exception {
        request.setRemoteAddr("10.0.0.20");
        interceptor.preHandle(request, response, new Object());
        MockHttpServletRequest other = new MockHttpServletRequest();
        other.setRemoteAddr("10.0.0.21");
        interceptor.preHandle(other, new MockHttpServletResponse(), new Object());
        assertThat(interceptor.bucketCount()).isEqualTo(2);

        // Still inside the window: nothing goes
        interceptor.evictExpiredBuckets(System.currentTimeMillis() + 30_000);
        assertThat(interceptor.bucketCount()).isEqualTo(2);

        // Window over: both go
        interceptor.evictExpiredBuckets(System.currentTimeMillis() + 61_000);
        assertThat(interceptor.bucketCount()).isZero();
    }

    @Test
    void afterEviction_clientStartsAFreshWindow() throws Exception {
        request.setRemoteAddr("10.0.0.22");
        for (int i = 0; i < 61; i++) {
            interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
        }
        interceptor.evictExpiredBuckets(System.currentTimeMillis() + 61_000);

        response = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("59");
    }
}
