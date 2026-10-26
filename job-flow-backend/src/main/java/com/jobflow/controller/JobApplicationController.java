package com.jobflow.controller;

import jakarta.validation.Valid;
import com.jobflow.dto.*;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.service.JobApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    @GetMapping
    public List<JobApplicationDTO> getAll(@RequestParam(required = false) ApplicationStatus status,
                                          @AuthenticationPrincipal Long userId) {
        if (status != null) {
            return jobApplicationService.findByStatus(userId, status);
        }
        return jobApplicationService.findAll(userId);
    }

    @GetMapping("/page")
    public PageResponse<JobApplicationDTO> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal Long userId) {
        return jobApplicationService.findAllPaged(userId, page, size, status, keyword, sortBy, sortDir);
    }

    @GetMapping("/{id}")
    public JobApplicationDTO getById(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return jobApplicationService.findById(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobApplicationDTO create(@Valid @RequestBody CreateJobApplicationRequest request,
                                    @AuthenticationPrincipal Long userId) {
        return jobApplicationService.create(userId, request);
    }

    @PutMapping("/{id}")
    public JobApplicationDTO update(@PathVariable Long id,
                                    @Valid @RequestBody UpdateJobApplicationRequest request,
                                    @AuthenticationPrincipal Long userId) {
        return jobApplicationService.update(userId, id, request);
    }

    @PatchMapping("/{id}/status")
    public JobApplicationDTO updateStatus(@PathVariable Long id,
                                          @RequestParam ApplicationStatus status,
                                          @AuthenticationPrincipal Long userId) {
        return jobApplicationService.updateStatus(userId, id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        jobApplicationService.delete(userId, id);
    }

    @PatchMapping("/{id}/star")
    public JobApplicationDTO toggleStar(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return jobApplicationService.toggleStar(userId, id);
    }

    @DeleteMapping("/batch")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBatch(@RequestBody List<Long> ids, @AuthenticationPrincipal Long userId) {
        jobApplicationService.deleteBatch(userId, ids);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(@AuthenticationPrincipal Long userId) {
        String csv = jobApplicationService.exportCsv(userId);
        byte[] bytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=applications.csv")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }

    @GetMapping("/stats")
    public DashboardStatsDTO getStats(@AuthenticationPrincipal Long userId) {
        return jobApplicationService.getStats(userId);
    }

    @GetMapping("/activity")
    public List<ApplicationActivityDTO> getActivity(@AuthenticationPrincipal Long userId) {
        return jobApplicationService.getActivity(userId);
    }

    @GetMapping("/recent")
    public List<JobApplicationDTO> getRecent(@AuthenticationPrincipal Long userId) {
        return jobApplicationService.findRecent(userId);
    }
}
