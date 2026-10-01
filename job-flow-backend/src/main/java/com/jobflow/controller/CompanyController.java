package com.jobflow.controller;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.CompanyService;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final UserRepository userRepository;

    @GetMapping
    public List<CompanyDTO> getAll(Authentication authentication) {
        return companyService.findAll(getUserId(authentication));
    }

    @GetMapping("/{id}")
    public CompanyDTO getById(@PathVariable Long id, Authentication authentication) {
        return companyService.findById(getUserId(authentication), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyDTO create(@RequestBody CreateCompanyRequest request, Authentication authentication) {
        return companyService.create(getUserId(authentication), request);
    }

    @PutMapping("/{id}")
    public CompanyDTO update(@PathVariable Long id, @RequestBody CreateCompanyRequest request,
                             Authentication authentication) {
        return companyService.update(getUserId(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        companyService.delete(getUserId(authentication), id);
    }

    private Long getUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
        return user.getId();
    }
}
