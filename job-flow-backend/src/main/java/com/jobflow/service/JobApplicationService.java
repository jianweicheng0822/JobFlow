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

    public PageResponse<JobApplicationDTO> findAllPaged(Long userId, int page, int size, ApplicationStatus status, String keyword, String sortBy, String sortDir) {
        // Map frontend sort field names to entity property paths
        String sortField = switch (sortBy) {
            case "appliedDate" -> "appliedDate";
            case "companyName" -> "company.name";
            case "status" -> "status";
            default -> "updatedAt";
        };
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Page<JobApplication> result;
        boolean hasKeyword = keyword != null && !keyword.isBlank();

        if (hasKeyword && status != null) {
            result = jobApplicationRepository.searchByKeywordAndStatus(userId, keyword.trim(), status, pageable);
        } else if (hasKeyword) {
            result = jobApplicationRepository.searchByKeyword(userId, keyword.trim(), pageable);
        } else if (status != null) {
            result = jobApplicationRepository.findByUserIdAndStatus(userId, status, pageable);
        } else {
            result = jobApplicationRepository.findByUserId(userId, pageable);
        }

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

    @Transactional
    public void deleteBatch(Long userId, List<Long> ids) {
        for (Long id : ids) {
            delete(userId, id);
        }
    }

    public List<JobApplicationDTO> findRecent(Long userId) {
        return jobApplicationRepository.findTop10ByUserIdOrderByUpdatedAtDesc(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public DashboardStatsDTO getStats(Long userId) {
        long total = jobApplicationRepository.countByUserId(userId);
        long interviews = jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEW);
        long offers = jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFER);

        double interviewRate = total > 0 ? Math.round(interviews * 1000.0 / total) / 10.0 : 0;
        double offerRate = total > 0 ? Math.round(offers * 1000.0 / total) / 10.0 : 0;

        return DashboardStatsDTO.builder()
            .totalApplications(total)
            .inReview(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.IN_REVIEW))
            .interviews(interviews)
            .offers(offers)
            .rejections(jobApplicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.REJECTED))
            .interviewRate(interviewRate)
            .offerRate(offerRate)
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

    public JobApplicationDTO toggleStar(Long userId, Long id) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));
        app.setStarred(!app.isStarred());
        return toDTO(jobApplicationRepository.save(app));
    }

    public String exportCsv(Long userId) {
        List<JobApplication> apps = jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        StringBuilder sb = new StringBuilder();
        sb.append("Position,Company,Status,Location,Salary,Applied Date,Last Action,Notes\n");
        for (JobApplication app : apps) {
            sb.append(escapeCsv(app.getPositionTitle())).append(',');
            sb.append(escapeCsv(app.getCompany() != null ? app.getCompany().getName() : "")).append(',');
            sb.append(app.getStatus()).append(',');
            sb.append(escapeCsv(app.getLocation())).append(',');
            sb.append(escapeCsv(app.getSalary())).append(',');
            sb.append(app.getAppliedDate()).append(',');
            sb.append(escapeCsv(app.getLastAction())).append(',');
            sb.append(escapeCsv(app.getNotes())).append('\n');
        }
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
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
            .starred(app.isStarred())
            .createdAt(app.getCreatedAt())
            .updatedAt(app.getUpdatedAt())
            .build();
    }
}
