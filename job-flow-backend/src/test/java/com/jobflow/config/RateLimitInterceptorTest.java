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
        assertThat(response.getContentAsString()).contains("Rate limit exceeded");
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
    void xForwardedFor_usesFirstIp() throws Exception {
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");

        interceptor.preHandle(request, response, new Object());

        // Second request from same forwarded IP
        response = new MockHttpServletResponse();
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setRemoteAddr("127.0.0.1");
        request2.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");
        interceptor.preHandle(request2, response, new Object());

        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("58");
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
}
