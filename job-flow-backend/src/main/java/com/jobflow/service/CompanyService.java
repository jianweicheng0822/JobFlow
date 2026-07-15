package com.jobflow.service;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.Company;
import com.jobflow.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;

    public List<CompanyDTO> findAll() {
        return companyRepository.findAll().stream()
            .map(this::toDTO)
            .toList();
    }

    public CompanyDTO findById(Long id) {
        Company company = companyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Company not found: " + id));
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
            .orElseThrow(() -> new RuntimeException("Company not found: " + id));
        company.setName(request.getName());
        company.setLogoUrl(request.getLogoUrl());
        company.setLocation(request.getLocation());
        company.setWebsite(request.getWebsite());
        return toDTO(companyRepository.save(company));
    }

    public void delete(Long id) {
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