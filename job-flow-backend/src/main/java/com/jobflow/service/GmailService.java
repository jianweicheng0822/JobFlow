package com.jobflow.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.model.*;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class GmailService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final EmailImportLogRepository emailImportLogRepository;

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret:}")
    private String googleClientSecret;

    private static final String GMAIL_SEARCH_QUERY =
            "subject:(\"thank you for applying\" OR \"application received\" OR " +
            "\"we received your application\" OR \"successfully applied\") newer_than:90d";

    // Common patterns for extracting position from subject lines
    private static final List<Pattern> POSITION_PATTERNS = List.of(
            Pattern.compile("(?:for|to)\\s+(?:the\\s+)?(.+?)\\s+(?:position|role|job|opening)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:application|applied)\\s+(?:for|to)\\s+(?:the\\s+)?(.+?)(?:\\s+at\\s+|\\s*[-–]\\s*|$)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:position|role):\\s*(.+?)(?:\\s+at\\s+|\\s*[-–]\\s*|$)", Pattern.CASE_INSENSITIVE)
    );

    public List<GmailImportPreviewDTO> scanEmails(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isGmailConnected() || user.getGoogleAccessToken() == null) {
            throw new RuntimeException("Gmail is not connected. Please log in with Google first.");
        }

        try {
            Gmail gmail = buildGmailClient(user);
            ListMessagesResponse response = gmail.users().messages()
                    .list("me")
                    .setQ(GMAIL_SEARCH_QUERY)
                    .setMaxResults(50L)
                    .execute();

            if (response.getMessages() == null || response.getMessages().isEmpty()) {
                return Collections.emptyList();
            }

            List<GmailImportPreviewDTO> previews = new ArrayList<>();
            for (Message msgRef : response.getMessages()) {
                String messageId = msgRef.getId();

                // Skip already-imported emails
                if (emailImportLogRepository.existsByUserIdAndGmailMessageId(userId, messageId)) {
                    continue;
                }

                Message fullMessage = gmail.users().messages()
                        .get("me", messageId)
                        .setFormat("metadata")
                        .setMetadataHeaders(List.of("Subject", "From", "Date"))
                        .execute();

                GmailImportPreviewDTO preview = parseMessage(messageId, fullMessage);
                if (preview != null) {
                    previews.add(preview);
                }
            }

            return previews;
        } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException e) {
            if (e.getStatusCode() == 401) {
                // Token expired, try refreshing
                refreshAccessToken(user);
                return scanEmails(userId); // retry once
            }
            log.error("Gmail API error during scan", e);
            throw new RuntimeException("Failed to scan Gmail: " + e.getDetails().getMessage());
        } catch (Exception e) {
            log.error("Failed to scan Gmail", e);
            throw new RuntimeException("Failed to scan Gmail: " + e.getMessage());
        }
    }

    @Transactional
    public GmailImportResultDTO importApplications(Long userId, GmailImportConfirmRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        int imported = 0;
        int skipped = 0;

        for (GmailImportConfirmRequest.ImportItem item : request.getItems()) {
            // Skip duplicates
            if (emailImportLogRepository.existsByUserIdAndGmailMessageId(userId, item.getGmailMessageId())) {
                skipped++;
                continue;
            }

            // Find or create company (same pattern as JobApplicationService.resolveCompany)
            String companyName = item.getCompanyName() != null ? item.getCompanyName().trim() : "Unknown";
            Company company = companyRepository.findByNameIgnoreCase(companyName)
                    .orElseGet(() -> companyRepository.save(
                            Company.builder().name(companyName).build()
                    ));

            // Create job application
            JobApplication app = JobApplication.builder()
                    .user(user)
                    .positionTitle(item.getPositionTitle() != null ? item.getPositionTitle() : "Unknown Position")
                    .company(company)
                    .status(ApplicationStatus.APPLIED)
                    .appliedDate(item.getAppliedDate() != null ? item.getAppliedDate() : LocalDate.now())
                    .notes("Imported from Gmail")
                    .build();
            jobApplicationRepository.save(app);

            // Log import to prevent future duplicates
            EmailImportLog importLog = EmailImportLog.builder()
                    .user(user)
                    .gmailMessageId(item.getGmailMessageId())
                    .jobApplication(app)
                    .build();
            emailImportLogRepository.save(importLog);

            imported++;
        }

        return GmailImportResultDTO.builder()
                .importedCount(imported)
                .skippedCount(skipped)
                .build();
    }

    private Gmail buildGmailClient(User user) throws Exception {
        GoogleCredentials credentials = GoogleCredentials.create(
                new AccessToken(user.getGoogleAccessToken(), null));

        return new Gmail.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("JobFlow")
                .build();
    }

    private void refreshAccessToken(User user) {
        if (user.getGoogleRefreshToken() == null) {
            throw new RuntimeException("No refresh token available. Please re-link your Google account.");
        }

        try {
            UserCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(googleClientId)
                    .setClientSecret(googleClientSecret)
                    .setRefreshToken(user.getGoogleRefreshToken())
                    .build();

            credentials.refresh();
            AccessToken newToken = credentials.getAccessToken();

            user.setGoogleAccessToken(newToken.getTokenValue());
            userRepository.save(user);
        } catch (Exception e) {
            log.error("Failed to refresh Google access token", e);
            user.setGmailConnected(false);
            userRepository.save(user);
            throw new RuntimeException("Failed to refresh Google access token. Please re-link your Google account.");
        }
    }

    private GmailImportPreviewDTO parseMessage(String messageId, Message message) {
        Map<String, String> headers = new HashMap<>();
        if (message.getPayload() != null && message.getPayload().getHeaders() != null) {
            for (MessagePartHeader header : message.getPayload().getHeaders()) {
                headers.put(header.getName().toLowerCase(), header.getValue());
            }
        }

        String subject = headers.getOrDefault("subject", "");
        String from = headers.getOrDefault("from", "");
        String dateStr = headers.getOrDefault("date", "");

        String companyName = parseCompanyFromSender(from);
        String positionTitle = parsePositionFromSubject(subject);
        LocalDate appliedDate = parseDateFromHeader(dateStr, message.getInternalDate());

        return GmailImportPreviewDTO.builder()
                .gmailMessageId(messageId)
                .subject(subject)
                .from(from)
                .companyName(companyName)
                .positionTitle(positionTitle)
                .appliedDate(appliedDate)
                .build();
    }

    /**
     * Extracts company name from the "From" header display name.
     * e.g. "Acme Corp <noreply@acme.com>" → "Acme Corp"
     */
    private String parseCompanyFromSender(String from) {
        if (from == null || from.isBlank()) return "Unknown";

        // Try to extract display name before the email address
        int angleBracket = from.indexOf('<');
        if (angleBracket > 0) {
            String displayName = from.substring(0, angleBracket).trim();
            // Remove surrounding quotes
            displayName = displayName.replaceAll("^\"|\"$", "").trim();
            if (!displayName.isEmpty()) {
                // Clean up common suffixes like "Recruiting", "Careers", "Jobs", "HR"
                return displayName
                        .replaceAll("(?i)\\s*(recruiting|careers|jobs|hr|talent|hiring|team|no-?reply)$", "")
                        .trim();
            }
        }

        // Fall back to domain name from email
        Matcher emailMatcher = Pattern.compile("<(.+?)>").matcher(from);
        if (emailMatcher.find()) {
            String email = emailMatcher.group(1);
            String domain = email.substring(email.indexOf('@') + 1);
            // Use domain without TLD as company name
            String[] parts = domain.split("\\.");
            if (parts.length > 0) {
                String name = parts[0];
                return name.substring(0, 1).toUpperCase() + name.substring(1);
            }
        }

        return "Unknown";
    }

    /**
     * Tries to extract a position/role title from the email subject line.
     */
    private String parsePositionFromSubject(String subject) {
        if (subject == null || subject.isBlank()) return "Unknown Position";

        for (Pattern pattern : POSITION_PATTERNS) {
            Matcher matcher = pattern.matcher(subject);
            if (matcher.find()) {
                String position = matcher.group(1).trim();
                if (!position.isEmpty() && position.length() < 100) {
                    return position;
                }
            }
        }

        return "Unknown Position";
    }

    /**
     * Parses date from the email Date header, falling back to internalDate.
     */
    private LocalDate parseDateFromHeader(String dateStr, Long internalDateMs) {
        // Fall back to Gmail's internal timestamp
        if (internalDateMs != null && internalDateMs > 0) {
            return Instant.ofEpochMilli(internalDateMs)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate();
        }
        return LocalDate.now();
    }
}
