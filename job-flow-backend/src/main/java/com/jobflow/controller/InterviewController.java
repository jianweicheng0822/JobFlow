package com.jobflow.controller;

import jakarta.validation.Valid;
import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @GetMapping
    public List<InterviewDTO> getAll(@AuthenticationPrincipal Long userId) {
        return interviewService.findAll(userId);
    }

    @GetMapping("/{id}")
    public InterviewDTO getById(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return interviewService.findById(userId, id);
    }

    @GetMapping("/upcoming")
    public List<InterviewDTO> getUpcoming(@AuthenticationPrincipal Long userId) {
        return interviewService.findUpcoming(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewDTO create(@Valid @RequestBody CreateInterviewRequest request,
                               @AuthenticationPrincipal Long userId) {
        return interviewService.create(userId, request);
    }

    @PutMapping("/{id}")
    public InterviewDTO update(@PathVariable Long id,
                               @Valid @RequestBody CreateInterviewRequest request,
                               @AuthenticationPrincipal Long userId) {
        return interviewService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        interviewService.delete(userId, id);
    }
}
