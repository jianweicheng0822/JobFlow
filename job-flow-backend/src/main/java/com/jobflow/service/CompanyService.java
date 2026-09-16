package com.jobflow.service;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.Company;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewRepository interviewRepository;
    private final EmailImportLogRepository emailImportLogRepository;

    public List<CompanyDTO> findAll() {
        return companyRepository.findAll().stream()
            .map(this::toDTO)
            .toList();
    }

    public CompanyDTO findById(Long id) {
        Company company = companyRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));
        return toDTO(company);
    }

    public CompanyDTO create(CreateCompanyRequest request) {
        Company company = Company.builder()
            .name(request.getName())
            .logoUrl(request.getLogoUrl())
            .location(request.getLocation())
            .website(request.getWebsite())
            .build();
        return toDTO(companyRepository.save(company));
    }

    public CompanyDTO update(Long id, CreateCompanyRequest request) {
        Company company = companyRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));
        company.setName(request.getName());
        company.setLogoUrl(request.getLogoUrl());
        company.setLocation(request.getLocation());
        company.setWebsite(request.getWebsite());
        return toDTO(companyRepository.save(company));
    }

    @Transactional
    public void delete(Long id) {
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