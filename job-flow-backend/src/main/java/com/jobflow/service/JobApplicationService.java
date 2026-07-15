package com.jobflow.service;

import com.jobflow.dto.*;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.Company;
import com.jobflow.model.JobApplication;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final CompanyRepository companyRepository;
    private final CompanyService companyService;

    public List<JobApplicationDTO> findAll() {
        return jobApplicationRepository.findAll().stream()
            .map(this::toDTO)
            .toList();
    }

    public List<JobApplicationDTO> findByStatus(ApplicationStatus status) {
        return jobApplicationRepository.findByStatusOrderByUpdatedAtDesc(status).stream()
            .map(this::toDTO)
            .toList();
    }

    public JobApplicationDTO findById(Long id) {
        JobApplication app = jobApplicationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Job application not found: " + id));
        return toDTO(app);
    }

    public JobApplicationDTO create(CreateJobApplicationRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
            .orElseThrow(() -> new RuntimeException("Company not found: " + request.getCompanyId()));

        JobApplication app = JobApplication.builder()
            .positionTitle(request.getPositionTitle())
            .company(company)
            .location(request.getLocation())
            .salary(request.getSalary())
            .status(request.getStatus() != null ? request.getStatus() : ApplicationStatus.APPLIED)
            .appliedDate(request.getAppliedDate() != null ? request.getAppliedDate() : LocalDate.now())
            .lastAction(request.getLastAction())
            .notes(request.getNotes())
            .build();
        return toDTO(jobApplicationRepository.save(app));
    }

    public JobApplicationDTO update(Long id, UpdateJobApplicationRequest request) {
        JobApplication app = jobApplicationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Job application not found: " + id));

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Company not found: " + request.getCompanyId()));
            app.setCompany(company);
        }
        if (request.getPositionTitle() != null) app.setPositionTitle(request.getPositionTitle());
        if (request.getLocation() != null) app.setLocation(request.getLocation());
        if (request.getSalary() != null) app.setSalary(request.getSalary());
        if (request.getStatus() != null) app.setStatus(request.getStatus());
        if (request.getAppliedDate() != null) app.setAppliedDate(request.getAppliedDate());
        if (request.getLastAction() != null) app.setLastAction(request.getLastAction());
        if (request.getNotes() != null) app.setNotes(request.getNotes());

        return toDTO(jobApplicationRepository.save(app));
    }

    public JobApplicationDTO updateStatus(Long id, ApplicationStatus status) {
        JobApplication app = jobApplicationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Job application not found: " + id));
        app.setStatus(status);
        return toDTO(jobApplicationRepository.save(app));
    }

    public void delete(Long id) {
        jobApplicationRepository.deleteById(id);
    }

    public List<JobApplicationDTO> findRecent() {
        return jobApplicationRepository.findTop10ByOrderByUpdatedAtDesc().stream()
            .map(this::toDTO)
            .toList();
    }

    public DashboardStatsDTO getStats() {
        return DashboardStatsDTO.builder()
            .totalApplications(jobApplicationRepository.count())
            .inReview(jobApplicationRepository.countByStatus(ApplicationStatus.IN_REVIEW))
            .interviews(jobApplicationRepository.countByStatus(ApplicationStatus.INTERVIEW))
            .offers(jobApplicationRepository.countByStatus(ApplicationStatus.OFFER))
            .rejections(jobApplicationRepository.countByStatus(ApplicationStatus.REJECTED))
            .build();
    }

    public List<ApplicationActivityDTO> getActivity() {
        List<ApplicationActivityDTO> activity = new ArrayList<>();
        LocalDate now = LocalDate.now();

        // Last 12 months of application activity
        for (int i = 11; i >= 0; i--) {
            LocalDate start = now.minusMonths(i).withDayOfMonth(1);
            LocalDate end = start.plusMonths(1).minusDays(1);
            long count = jobApplicationRepository.countByAppliedDateBetween(start, end);
            String month = start.getMonth().name().substring(0, 3);
            activity.add(new ApplicationActivityDTO(month, count));
        }
        return activity;
    }

    private JobApplicationDTO toDTO(JobApplication app) {
        return JobApplicationDTO.builder()
            .id(app.getId())
            .positionTitle(app.getPositionTitle())
            .company(companyService.toDTO(app.getCompany()))
            .location(app.getLocation())
            .salary(app.getSalary())
            .status(app.getStatus())
            .appliedDate(app.getAppliedDate())
            .lastAction(app.getLastAction())
            .notes(app.getNotes())
            .createdAt(app.getCreatedAt())
            .updatedAt(app.getUpdatedAt())
            .build();
    }
}