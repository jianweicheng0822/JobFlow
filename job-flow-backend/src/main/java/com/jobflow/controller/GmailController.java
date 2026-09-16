package com.jobflow.controller;

import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.GmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gmail")
@RequiredArgsConstructor
public class GmailController {

    private final GmailService gmailService;
    private final UserRepository userRepository;

    @PostMapping("/scan")
    public List<GmailImportPreviewDTO> scanEmails(Authentication authentication) {
        return gmailService.scanEmails(getUserId(authentication));
    }

    @PostMapping("/import")
    public GmailImportResultDTO importApplications(@RequestBody GmailImportConfirmRequest request,
                                                   Authentication authentication) {
        return gmailService.importApplications(getUserId(authentication), request);
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus(Authentication authentication) {
        User user = getUser(authentication);
        return Map.of(
                "gmailConnected", user.isGmailConnected(),
                "provider", user.getProvider().name()
        );
    }

    private Long getUserId(Authentication authentication) {
        return getUser(authentication).getId();
    }

    private User getUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
