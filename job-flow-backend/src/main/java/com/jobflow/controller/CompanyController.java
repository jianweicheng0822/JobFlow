package com.jobflow.controller;

import jakarta.validation.Valid;
import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    public List<CompanyDTO> getAll(@AuthenticationPrincipal Long userId) {
        return companyService.findAll(userId);
    }

    @GetMapping("/{id}")
    public CompanyDTO getById(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return companyService.findById(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyDTO create(@Valid @RequestBody CreateCompanyRequest request, @AuthenticationPrincipal Long userId) {
        return companyService.create(userId, request);
    }

    @PutMapping("/{id}")
    public CompanyDTO update(@PathVariable Long id, @Valid @RequestBody CreateCompanyRequest request,
                             @AuthenticationPrincipal Long userId) {
        return companyService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        companyService.delete(userId, id);
    }
}
