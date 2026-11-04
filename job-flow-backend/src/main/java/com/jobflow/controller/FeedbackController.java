package com.jobflow.controller;

import com.jobflow.dto.FeedbackRequest;
import com.jobflow.service.FeedbackService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    // Open to everyone, including the demo (whose fake token simply counts as logged out).
    // Bots that trip the honeypot get the same 204 as people, so they can't tell.
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submit(@Valid @RequestBody FeedbackRequest request,
                       @AuthenticationPrincipal Long userId,
                       HttpServletRequest httpRequest) {
        feedbackService.submit(request, userId, httpRequest.getRemoteAddr(),
                httpRequest.getHeader(HttpHeaders.USER_AGENT));
    }
}
