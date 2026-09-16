package com.jobflow.service;

import com.jobflow.dto.*;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.Company;
import com.jobflow.model.JobApplication;
import com.jobflow.model.User;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanyService companyService;
    private final EmailImportLogRepository emailImportLogRepository;
    private final InterviewRepository interviewRepository;

    public List<JobApplicationDTO> findAll(Long userId) {
        return jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public PageResponse<JobApplicationDTO> findAllPaged(Long userId, int page, int size, ApplicationStatus status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<JobApplication> result = (status != null)
            ? jobApplicationRepository.findByUserIdAndStatus(userId, status, pageable)
            : jobApplicationRepository.findByUserId(userId, pageable);

        return PageResponse.<JobApplicationDTO>builder()
            .content(result.getContent().stream().map(this::toDTO).toList())
            .page(result.getNumber())
            .size(result.getSize())
            .totalElements(result.getTotalElements())
            .totalPages(result.getTotalPages())
            .build();
    }

    public List<JobApplicationDTO> findByStatus(Long userId, ApplicationStatus status) {
        return jobApplicationRepository.findByUserIdAndStatusOrderByUpdatedAtDesc(userId, status).stream()
            .map(this::toDTO)
            .toList();
    }

    public JobApplicationDTO findById(Long userId, Long id) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));
        return toDTO(app);
    }

    public JobApplicationDTO create(Long userId, CreateJobApplicationRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));

        Company company = resolveCompany(request);

        JobApplication app = JobApplication.builder()
            .user(user)
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

    // Look up company by ID, or find/create by name
    private Company resolveCompany(CreateJobApplicationRequest request) {
        if (request.getCompanyId() != null) {
            return companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found: " + request.getCompanyId()));
        }

        String name = request.getCompanyName();
        if (name == null || name.isBlank()) {
            throw new RuntimeException("Either companyId or companyName is required");
        }

        return companyRepository.findByNameIgnoreCase(name.trim())
            .orElseGet(() -> companyRepository.save(
                Company.builder().name(name.trim()).build()
            ));
    }

    public JobApplicationDTO update(Long userId, Long id, UpdateJobApplicationRequest request) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found: " + request.getCompanyId()));
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

    public JobApplicationDTO updateStatus(Long userId, Long id, ApplicationStatus status) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));
        app.setStatus(status);
        return toDTO(jobApplicationRepository.save(app));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));
        interviewRepository.deleteByJobApplicationId(id);
        emailImportLogRepository.deleteByJobApplicationId(id);
        jobApplicationRepository.delete(app);
    }

    public List<JobApplicationDTO> findRecent(Long userId) {
        return jobApplicationRepository.findTop10ByUserIdOrderByUpdatedAtDesc(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public DashboardStatsDTO getStats(Long userId) {
        return DashboardStatsDTO.builder()
            .totalApplications(jobApplicationRepository.countByUserId(userId))
            .inReview(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.IN_REVIEW))
            .interviews(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEW))
            .offers(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFER))
            .rejections(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.REJECTED))
            .build();
    }

    public List<ApplicationActivityDTO> getActivity(Long userId) {
        List<ApplicationActivityDTO> activity = new ArrayList<>();
        LocalDate now = LocalDate.now();

        for (int i = 11; i >= 0; i--) {
            LocalDate start = now.minusMonths(i).withDayOfMonth(1);
            LocalDate end = start.plusMonths(1).minusDays(1);
            long count = jobApplicationRepository.countByUserIdAndAppliedDateBetween(userId, start, end);
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
