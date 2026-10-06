package com.jobflow.service;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.Company;
import com.jobflow.model.User;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.jobflow.util.TextUtils.blankToNull;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewRepository interviewRepository;
    private final EmailImportLogRepository emailImportLogRepository;
    private final UserRepository userRepository;

    public List<CompanyDTO> findAll(Long userId) {
        return companyRepository.findByUserId(userId).stream()
            .map(this::toDTO)
            .toList();
    }

    public CompanyDTO findById(Long userId, Long id) {
        Company company = companyRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));
        return toDTO(company);
    }

    public CompanyDTO create(Long userId, CreateCompanyRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));

        Company company = Company.builder()
            .name(requireName(request.getName()))
            .logoUrl(blankToNull(request.getLogoUrl()))
            .location(blankToNull(request.getLocation()))
            .website(blankToNull(request.getWebsite()))
            .user(user)
            .build();
        return toDTO(companyRepository.save(company));
    }

    public CompanyDTO update(Long userId, Long id, CreateCompanyRequest request) {
        Company company = companyRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));
        company.setName(requireName(request.getName()));
        company.setLogoUrl(blankToNull(request.getLogoUrl()));
        company.setLocation(blankToNull(request.getLocation()));
        company.setWebsite(blankToNull(request.getWebsite()));
        return toDTO(companyRepository.save(company));
    }

    // The controller validates this too; repeated here for callers that skip it
    private static String requireName(String name) {
        String trimmed = blankToNull(name);
        if (trimmed == null) throw new IllegalArgumentException("Company name is required");
        return trimmed;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        companyRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));

        List<Long> appIds = jobApplicationRepository.findIdsByCompanyId(id);
        if (!appIds.isEmpty()) {
            interviewRepository.deleteByJobApplicationIdIn(appIds);
            emailImportLogRepository.deleteByJobApplicationIdIn(appIds);
            jobApplicationRepository.deleteByCompanyId(id);
        }
        companyRepository.deleteById(id);
    }

    public CompanyDTO toDTO(Company company) {
        return CompanyDTO.builder()
            .id(company.getId())
            .name(company.getName())
            .logoUrl(company.getLogoUrl())
            .location(company.getLocation())
            .website(company.getWebsite())
            .build();
    }
}
