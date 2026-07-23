package com.jobflow.controller;

import com.jobflow.dto.CreateInterviewRequest;
import com.jobflow.dto.InterviewDTO;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;
    private final UserRepository userRepository;

    @GetMapping
    public List<InterviewDTO> getAll(Authentication authentication) {
        return interviewService.findAll(getUserId(authentication));
    }

    @GetMapping("/{id}")
    public InterviewDTO getById(@PathVariable Long id, Authentication authentication) {
        return interviewService.findById(getUserId(authentication), id);
    }

    @GetMapping("/upcoming")
    public List<InterviewDTO> getUpcoming(Authentication authentication) {
        return interviewService.findUpcoming(getUserId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewDTO create(@RequestBody CreateInterviewRequest request,
                               Authentication authentication) {
        return interviewService.create(getUserId(authentication), request);
    }

    @PutMapping("/{id}")
    public InterviewDTO update(@PathVariable Long id,
                               @RequestBody CreateInterviewRequest request,
                               Authentication authentication) {
        return interviewService.update(getUserId(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        interviewService.delete(getUserId(authentication), id);
    }

    private Long getUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
