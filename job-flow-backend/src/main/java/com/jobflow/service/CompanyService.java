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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.function.Supplier;

import static com.jobflow.util.TextUtils.blankToNull;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewRepository interviewRepository;
    private final EmailImportLogRepository emailImportLogRepository;
    private final UserRepository userRepository;
    private final PlatformTransactionManager transactionManager;

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

        String name = requireName(request.getName());
        rejectDuplicateName(userId, name, null);

        Company company = Company.builder()
            .name(name)
            .logoUrl(blankToNull(request.getLogoUrl()))
            .location(blankToNull(request.getLocation()))
            .website(blankToNull(request.getWebsite()))
            .user(user)
            .build();
        return toDTO(saveUnique(company, name));
    }

    public CompanyDTO update(Long userId, Long id, CreateCompanyRequest request) {
        Company company = companyRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Company not found: " + id));
        String name = requireName(request.getName());
        rejectDuplicateName(userId, name, id);

        company.setName(name);
        company.setLogoUrl(blankToNull(request.getLogoUrl()));
        company.setLocation(blankToNull(request.getLocation()));
        company.setWebsite(blankToNull(request.getWebsite()));
        return toDTO(saveUnique(company, name));
    }

    /**
     * Returns the user's company with this name (case-insensitive), creating it if needed.
     * Used wherever a company is picked by typing a name: new/edited applications and Gmail import.
     *
     * Two requests can race here. The unique (user_id, name) constraint lets only one insert
     * win; the loser looks again in a brand-new transaction, because a query inside the
     * caller's transaction might not see a row committed after it started.
     */
    public Company findOrCreateByName(User user, String name) {
        try {
            return inNewTransaction(() -> companyRepository.findByNameIgnoreCaseAndUserId(name, user.getId())
                .orElseGet(() -> companyRepository.saveAndFlush(Company.builder().name(name).user(user).build())));
        } catch (DataIntegrityViolationException e) {
            return inNewTransaction(() -> companyRepository.findByNameIgnoreCaseAndUserId(name, user.getId())
                .orElseThrow(() -> e));
        }
    }

    private <T> T inNewTransaction(Supplier<T> work) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tx.execute(status -> work.get());
    }

    // Friendly check for the Companies page; the unique constraint is the real guard
    private void rejectDuplicateName(Long userId, String name, Long ownId) {
        companyRepository.findByNameIgnoreCaseAndUserId(name, userId)
            .filter(existing -> !existing.getId().equals(ownId))
            .ifPresent(existing -> { throw duplicateName(name); });
    }

    // Covers the race the pre-check can't: someone else saved the same name in between
    private Company saveUnique(Company company, String name) {
        try {
            return companyRepository.saveAndFlush(company);
        } catch (DataIntegrityViolationException e) {
            throw duplicateName(name);
        }
    }

    private static IllegalArgumentException duplicateName(String name) {
        return new IllegalArgumentException("A company named '" + name + "' already exists");
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
