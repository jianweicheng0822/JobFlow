package com.jobflow.service;

import com.jobflow.dto.DeleteAccountRequest;
import com.jobflow.exception.ApiException;
import com.jobflow.exception.NotFoundException;
import com.jobflow.model.User;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.TokenVersions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Deletes a user and everything they own. The privacy policy promises this, so it's
 * a real delete, not a "deactivated" flag.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final EmailImportLogRepository emailImportLogRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleTokenRevoker googleTokenRevoker;
    private final TokenVersions tokenVersions;
    private final PlatformTransactionManager transactionManager;

    public void deleteAccount(Long userId, DeleteAccountRequest request) {
        // Revoke after the commit: a slow call to Google shouldn't hold the transaction open,
        // and a failed one shouldn't keep the account around
        String gmailToken = new TransactionTemplate(transactionManager).execute(status -> {
            User user = userRepository.findById(userId).orElseThrow(NotFoundException::user);
            confirm(user, request);
            String token = user.getGoogleRefreshToken() != null ? user.getGoogleRefreshToken() : user.getGoogleAccessToken();

            // Children first, in foreign key order; one-time codes go with the user (ON DELETE CASCADE)
            interviewRepository.deleteByUserId(userId);
            emailImportLogRepository.deleteByUserId(userId);
            jobApplicationRepository.deleteByUserId(userId);
            companyRepository.deleteByUserId(userId);
            userRepository.delete(user);
            return token;
        });
        tokenVersions.forget(userId);
        log.info("Deleted account {}", userId);

        if (gmailToken != null) {
            googleTokenRevoker.revoke(gmailToken);
        }
    }

    private void confirm(User user, DeleteAccountRequest request) {
        if (user.getPassword() != null) {
            if (request.getPassword() == null || request.getPassword().isBlank()) {
                throw ApiException.badRequest("CURRENT_PASSWORD_REQUIRED", "Current password is required");
            }
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw ApiException.badRequest("CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
            }
        } else if (request.getConfirmEmail() == null
                || !request.getConfirmEmail().trim().equalsIgnoreCase(user.getEmail())) {
            throw ApiException.badRequest("DELETE_CONFIRMATION_MISMATCH", "Type your account email to confirm");
        }
    }
}
