package com.jobflow.controller;

import com.jobflow.dto.*;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.service.JobApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    @GetMapping
    public List<JobApplicationDTO> getAll(@RequestParam(required = false) ApplicationStatus status) {
        if (status != null) {
            return jobApplicationService.findByStatus(status);
        }
        return jobApplicationService.findAll();
    }

    @GetMapping("/{id}")
    public JobApplicationDTO getById(@PathVariable Long id) {
        return jobApplicationService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobApplicationDTO create(@RequestBody CreateJobApplicationRequest request) {
        return jobApplicationService.create(request);
    }

    @PutMapping("/{id}")
    public JobApplicationDTO update(@PathVariable Long id, @RequestBody UpdateJobApplicationRequest request) {
        return jobApplicationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public JobApplicationDTO updateStatus(@PathVariable Long id, @RequestParam ApplicationStatus status) {
        return jobApplicationService.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        jobApplicationService.delete(id);
    }

    @GetMapping("/stats")
    public DashboardStatsDTO getStats() {
        return jobApplicationService.getStats();
    }

    @GetMapping("/activity")
    public List<ApplicationActivityDTO> getActivity() {
        return jobApplicationService.getActivity();
    }

    @GetMapping("/recent")
    public List<JobApplicationDTO> getRecent() {
        return jobApplicationService.findRecent();
    }
}