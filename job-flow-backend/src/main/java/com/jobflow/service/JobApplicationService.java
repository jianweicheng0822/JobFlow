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

import static com.jobflow.util.TextUtils.blankToNull;

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

        // The controller validates this too; repeated here for callers that skip it
        String positionTitle = blankToNull(request.getPositionTitle());
        if (positionTitle == null) {
            throw new IllegalArgumentException("Position title is required");
        }

        Company company = resolveCompany(user, request);

        JobApplication app = JobApplication.builder()
            .user(user)
            .positionTitle(positionTitle)
            .company(company)
            .location(blankToNull(request.getLocation()))
            .salary(blankToNull(request.getSalary()))
            .status(request.getStatus() != null ? request.getStatus() : ApplicationStatus.APPLIED)
            .appliedDate(request.getAppliedDate() != null ? request.getAppliedDate() : LocalDate.now())
            .lastAction(blankToNull(request.getLastAction()))
            .notes(blankToNull(request.getNotes()))
            .build();
        return toDTO(jobApplicationRepository.save(app));
    }

    // Look up company by ID (with ownership check), or find/create by name for user
    private Company resolveCompany(User user, CreateJobApplicationRequest request) {
        if (request.getCompanyId() != null) {
            return companyRepository.findByIdAndUserId(request.getCompanyId(), user.getId())
                .orElseThrow(() -> new NotFoundException("Company not found: " + request.getCompanyId()));
        }

        String name = blankToNull(request.getCompanyName());
        if (name == null) {
            throw new IllegalArgumentException("Company is required");
        }

        return findOrCreateCompany(user, name);
    }

    // Reuse the user's company with this name (case-insensitive) or create it
    private Company findOrCreateCompany(User user, String name) {
        return companyRepository.findByNameIgnoreCaseAndUserId(name, user.getId())
            .orElseGet(() -> companyRepository.save(
                Company.builder().name(name).user(user).build()
            ));
    }

    public JobApplicationDTO update(Long userId, Long id, UpdateJobApplicationRequest request) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findByIdAndUserId(request.getCompanyId(), userId)
                .orElseThrow(() -> new NotFoundException("Company not found: " + request.getCompanyId()));
            app.setCompany(company);
        } else if (request.getCompanyName() != null) {
            // Typed a company name instead of picking one from the list
            String companyName = blankToNull(request.getCompanyName());
            if (companyName == null) throw new IllegalArgumentException("Company name cannot be blank");
            app.setCompany(findOrCreateCompany(app.getUser(), companyName));
        }
        // null = leave as is; for optional fields, a blank value clears them
        if (request.getPositionTitle() != null) {
            String positionTitle = blankToNull(request.getPositionTitle());
            if (positionTitle == null) throw new IllegalArgumentException("Position title cannot be blank");
            app.setPositionTitle(positionTitle);
        }
        if (request.getLocation() != null) app.setLocation(blankToNull(request.getLocation()));
        if (request.getSalary() != null) app.setSalary(blankToNull(request.getSalary()));
        if (request.getStatus() != null) changeStatus(app, request.getStatus());
        if (request.getAppliedDate() != null) app.setAppliedDate(request.getAppliedDate());
        // Runs after changeStatus on purpose, so an explicit lastAction wins over the auto one
        String lastAction = blankToNull(request.getLastAction());
        if (lastAction != null) app.setLastAction(lastAction);
        if (request.getNotes() != null) app.setNotes(blankToNull(request.getNotes()));

        return toDTO(jobApplicationRepository.save(app));
    }

    public JobApplicationDTO updateStatus(Long userId, Long id, ApplicationStatus status) {
        JobApplication app = jobApplicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Job application not found: " + id));
        changeStatus(app, status);
        return toDTO(jobApplicationRepository.save(app));
    }

    // Sets the new status and, only if it actually changed, records it as the last action
    // The frontend translates this text for display (utils/formatLastAction.ts), so keep the "Moved to ..." wording in sync
    private void changeStatus(JobApplication app, ApplicationStatus status) {
        if (app.getStatus() == status) return;
        app.setStatus(status);
        app.setLastAction("Moved to " + statusLabel(status));
    }

    // PHONE_SCREEN -> "Phone Screen"
    private static String statusLabel(ApplicationStatus status) {
        StringBuilder sb = new StringBuilder();
        for (String word : status.name().split("_")) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(word.charAt(0)).append(word.substring(1).toLowerCase());
        }
        return sb.toString();
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
