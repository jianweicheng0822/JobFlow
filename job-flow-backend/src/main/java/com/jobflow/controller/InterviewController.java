package com.jobflow.controller;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @GetMapping
    public List<InterviewDTO> getAll() {
        return interviewService.findAll();
    }

    @GetMapping("/{id}")
    public InterviewDTO getById(@PathVariable Long id) {
        return interviewService.findById(id);
    }

    @GetMapping("/upcoming")
    public List<InterviewDTO> getUpcoming() {
        return interviewService.findUpcoming();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewDTO create(@RequestBody CreateInterviewRequest request) {
        return interviewService.create(request);
    }

    @PutMapping("/{id}")
    public InterviewDTO update(@PathVariable Long id, @RequestBody CreateInterviewRequest request) {
        return interviewService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        interviewService.delete(id);
    }
}