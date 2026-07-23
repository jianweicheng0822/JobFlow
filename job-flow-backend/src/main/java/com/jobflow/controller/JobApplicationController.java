package com.jobflow.controller;

import com.jobflow.dto.*;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.JobApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;
    private final UserRepository userRepository;

    @GetMapping
    public List<JobApplicationDTO> getAll(@RequestParam(required = false) ApplicationStatus status,
                                          Authentication authentication) {
        Long userId = getUserId(authentication);
        if (status != null) {
            return jobApplicationService.findByStatus(userId, status);
        }
        return jobApplicationService.findAll(userId);
    }

    @GetMapping("/{id}")
    public JobApplicationDTO getById(@PathVariable Long id, Authentication authentication) {
        return jobApplicationService.findById(getUserId(authentication), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobApplicationDTO create(@RequestBody CreateJobApplicationRequest request,
                                    Authentication authentication) {
        return jobApplicationService.create(getUserId(authentication), request);
    }

    @PutMapping("/{id}")
    public JobApplicationDTO update(@PathVariable Long id,
                                    @RequestBody UpdateJobApplicationRequest request,
                                    Authentication authentication) {
        return jobApplicationService.update(getUserId(authentication), id, request);
    }

    @PatchMapping("/{id}/status")
    public JobApplicationDTO updateStatus(@PathVariable Long id,
                                          @RequestParam ApplicationStatus status,
                                          Authentication authentication) {
        return jobApplicationService.updateStatus(getUserId(authentication), id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        jobApplicationService.delete(getUserId(authentication), id);
    }

    @GetMapping("/stats")
    public DashboardStatsDTO getStats(Authentication authentication) {
        return jobApplicationService.getStats(getUserId(authentication));
    }

    @GetMapping("/activity")
    public List<ApplicationActivityDTO> getActivity(Authentication authentication) {
        return jobApplicationService.getActivity(getUserId(authentication));
    }

    @GetMapping("/recent")
    public List<JobApplicationDTO> getRecent(Authentication authentication) {
        return jobApplicationService.findRecent(getUserId(authentication));
    }

    private Long getUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
