package com.jobflow.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpResponseException;
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
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.exception.ExternalServiceException;
import com.jobflow.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.jobflow.exception.ApiException;

import static com.jobflow.util.TextUtils.blankToNull;
import static com.jobflow.util.TextUtils.truncate;

@Service
@RequiredArgsConstructor
@Slf4j
public class GmailService {

    private final UserRepository userRepository;
    private final CompanyService companyService;
    private final JobApplicationRepository jobApplicationRepository;
    private final EmailImportLogRepository emailImportLogRepository;
    private final UserClock userClock;

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret:}")
    private String googleClientSecret;

    private static final String GMAIL_SEARCH_QUERY =
            "subject:(\"thank you for applying\" OR \"thanks for applying\" OR " +
            "\"application received\" OR \"application confirmation\" OR " +
            "\"application submitted\" OR \"successfully applied\" OR " +
            "\"we received your application\" OR \"we have received your application\" OR " +
            "\"your application to\" OR \"your application for\" OR " +
            "\"your application has been\" OR \"you applied to\" OR " +
            "\"application for the position\") newer_than:90d";
    private static final String GMAIL_UNAVAILABLE = "Couldn't reach Gmail. Please try again in a moment.";

    // LinkedIn-specific patterns: "You applied to [Position] at [Company]"
    private static final List<Pattern> LINKEDIN_PATTERNS = List.of(
            Pattern.compile("(?:you\\s+applied\\s+to|applied\\s+to)\\s+(.+?)\\s+at\\s+(.+?)$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:your\\s+application\\s+(?:to|for|was\\s+sent\\s+to))\\s+(.+?)\\s+at\\s+(.+?)$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:you\\s+applied\\s+to|applied\\s+to)\\s+(.+?)\\s+at\\s+(.+?)(?:\\s*[-–|])", Pattern.CASE_INSENSITIVE)
    );

    // Patterns that extract BOTH position and company from subject: [position] at [company]
    private static final List<Pattern> SUBJECT_POSITION_AND_COMPANY_PATTERNS = List.of(
            // "Thank you for applying to Software Engineer at Google"
            Pattern.compile("(?:applying|applied)\\s+(?:to|for)\\s+(?:the\\s+)?(.+?)\\s+at\\s+(.+?)$", Pattern.CASE_INSENSITIVE),
            // "Your application for Software Engineer at Google has been received"
            Pattern.compile("application\\s+(?:for|to)\\s+(?:the\\s+)?(.+?)\\s+at\\s+(.+?)(?:\\s+has\\b|\\s*[-–]|$)", Pattern.CASE_INSENSITIVE),
            // "Application confirmation: Software Engineer at Google"
            Pattern.compile("(?:confirmation|received|submitted)\\s*[:–-]\\s*(.+?)\\s+at\\s+(.+?)$", Pattern.CASE_INSENSITIVE)
    );

    // Patterns that extract position only from subject
    private static final List<Pattern> POSITION_PATTERNS = List.of(
            // "for the Software Engineer position/role/job"
            Pattern.compile("(?:for|to)\\s+(?:the\\s+)?(.+?)\\s+(?:position|role|job|opening)", Pattern.CASE_INSENSITIVE),
            // "application for Software Engineer at ..." or "applied to Software Engineer"
            Pattern.compile("(?:application|applied)\\s+(?:for|to)\\s+(?:the\\s+)?(.+?)(?:\\s+at\\s+|\\s*[-–]\\s*|$)", Pattern.CASE_INSENSITIVE),
            // "position: Software Engineer" or "role: Software Engineer"
            Pattern.compile("(?:position|role):\\s*(.+?)(?:\\s+at\\s+|\\s*[-–]\\s*|$)", Pattern.CASE_INSENSITIVE),
            // "Thank you for applying - Software Engineer"
            Pattern.compile("(?:applying|applied|received|confirmation)\\s*[-–:]+\\s*(.+?)(?:\\s+at\\s+|$)", Pattern.CASE_INSENSITIVE),
            // "Software Engineer - Application Received"
            Pattern.compile("^(.+?)\\s*[-–]+\\s*(?:application|your application)", Pattern.CASE_INSENSITIVE),
            // "Application received for Software Engineer"
            Pattern.compile("(?:received|confirmation|submitted)\\s+(?:for|regarding)\\s+(?:the\\s+)?(.+?)$", Pattern.CASE_INSENSITIVE)
    );

    // Pattern to extract company from subject when "at [Company]" appears
    private static final Pattern SUBJECT_COMPANY_PATTERN =
            Pattern.compile("\\bat\\s+(.+?)(?:\\s*[-–|!.]|\\s+has\\b|$)", Pattern.CASE_INSENSITIVE);

    public List<GmailImportPreviewDTO> scanEmails(Long userId) {
        return scanEmails(userId, false);
    }

    // alreadyRetried makes sure we refresh the token and retry at most once
    private List<GmailImportPreviewDTO> scanEmails(Long userId, boolean alreadyRetried) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.user());

        if (!user.isGmailConnected() || user.getGoogleAccessToken() == null) {
            throw ApiException.badRequest("GMAIL_NOT_CONNECTED", "Gmail is not connected. Please log in with Google first.");
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

                GmailImportPreviewDTO preview = parseMessage(messageId, fullMessage, userClock.zoneOf(user));
                if (preview != null) {
                    previews.add(preview);
                }
            }

            return previews;
        } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException e) {
            if (e.getStatusCode() == 401) {
                if (alreadyRetried) {
                    // A fresh token was still rejected, e.g. access was revoked on Google's side
                    throw ApiException.badRequest("GMAIL_RELINK_REQUIRED", "Gmail access was rejected. Please re-link your Google account.");
                }
                // Token expired, refresh and retry once
                refreshAccessToken(user);
                return scanEmails(userId, true);
            }
            log.error("Gmail API error during scan", e);
            throw new ExternalServiceException("GMAIL_UNAVAILABLE", GMAIL_UNAVAILABLE, e);
        } catch (Exception e) {
            log.error("Failed to scan Gmail", e);
            throw new ExternalServiceException("GMAIL_UNAVAILABLE", GMAIL_UNAVAILABLE, e);
        }
    }

    @Transactional
    public GmailImportResultDTO importApplications(Long userId, GmailImportConfirmRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.user());

        int imported = 0;
        int skipped = 0;
        Set<String> seenInThisRequest = new HashSet<>();

        for (GmailImportConfirmRequest.ImportItem item : request.getItems()) {
            // Skip emails imported before, or listed twice in this request
            if (!seenInThisRequest.add(item.getGmailMessageId())
                    || emailImportLogRepository.existsByUserIdAndGmailMessageId(userId, item.getGmailMessageId())) {
                skipped++;
                continue;
            }

            // Subjects can be long or edited to blank; clean them up rather than failing the whole batch
            String companyName = importText(item.getCompanyName(), "Unknown");
            String positionTitle = importText(item.getPositionTitle(), "Unknown Position");
            Company company = companyService.findOrCreateByName(user, companyName);

            // Create job application
            JobApplication app = JobApplication.builder()
                    .user(user)
                    .positionTitle(positionTitle)
                    .company(company)
                    .status(ApplicationStatus.APPLIED)
                    .appliedDate(item.getAppliedDate() != null ? item.getAppliedDate() : userClock.today(user))
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

    // Trimmed, blank -> fallback, and capped at the 255-char column size
    private static String importText(String value, String fallback) {
        return Optional.ofNullable(blankToNull(value))
                .map(text -> truncate(text, 255))
                .orElse(fallback);
    }

    // Package-private so tests can swap in a fake client
    Gmail buildGmailClient(User user) throws Exception {
        GoogleCredentials credentials = GoogleCredentials.create(
                new AccessToken(user.getGoogleAccessToken(), null));

        return new Gmail.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("JobFlow")
                .build();
    }

    // Package-private so tests can stub the call to Google
    void refreshAccessToken(User user) {
        if (user.getGoogleRefreshToken() == null) {
            throw ApiException.badRequest("GMAIL_RELINK_REQUIRED", "No refresh token available. Please re-link your Google account.");
        }

        AccessToken newToken;
        try {
            newToken = fetchNewAccessToken(user.getGoogleRefreshToken());
        } catch (Exception e) {
            if (isTokenRejected(e)) {
                // Google refused the refresh token itself (revoked, expired...): only re-linking fixes that
                log.warn("Google rejected the refresh token for user {}", user.getId(), e);
                user.setGmailConnected(false);
                userRepository.save(user);
                throw ApiException.badRequest("GMAIL_RELINK_REQUIRED", "Failed to refresh Google access token. Please re-link your Google account.");
            }
            // Network blip or a Google outage: keep the link so the next try can just work
            log.error("Couldn't reach Google to refresh the access token", e);
            throw new ExternalServiceException("GMAIL_UNAVAILABLE", GMAIL_UNAVAILABLE, e);
        }

        user.setGoogleAccessToken(newToken.getTokenValue());
        userRepository.save(user);
    }

    // Package-private so tests can stub the call to Google's token endpoint
    AccessToken fetchNewAccessToken(String refreshToken) throws IOException {
        UserCredentials credentials = UserCredentials.newBuilder()
                .setClientId(googleClientId)
                .setClientSecret(googleClientSecret)
                .setRefreshToken(refreshToken)
                .build();
        credentials.refresh();
        return credentials.getAccessToken();
    }

    // A 400/401 from the token endpoint (e.g. invalid_grant) means the refresh token is no good.
    // Anything else (timeouts, 5xx) is temporary and shouldn't unlink the account.
    static boolean isTokenRejected(Throwable error) {
        for (Throwable t = error; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (t instanceof HttpResponseException hre) {
                int status = hre.getStatusCode();
                return status == 400 || status == 401;
            }
        }
        return false;
    }

    private GmailImportPreviewDTO parseMessage(String messageId, Message message, ZoneId userZone) {
        Map<String, String> headers = new HashMap<>();
        if (message.getPayload() != null && message.getPayload().getHeaders() != null) {
            for (MessagePartHeader header : message.getPayload().getHeaders()) {
                headers.put(header.getName().toLowerCase(), header.getValue());
            }
        }

        String subject = headers.getOrDefault("subject", "");
        String from = headers.getOrDefault("from", "");
        LocalDate appliedDate = parseDateFromHeader(message.getInternalDate(), userZone);

        String companyName;
        String positionTitle;

        if (isLinkedInEmail(from)) {
            // LinkedIn emails have a predictable subject format
            String[] parsed = parseLinkedInSubject(subject);
            positionTitle = parsed[0];
            companyName = parsed[1];
        } else {
            // Try to extract both position and company from subject first
            String[] both = parsePositionAndCompanyFromSubject(subject);
            if (both != null) {
                positionTitle = both[0];
                companyName = both[1];
            } else {
                positionTitle = parsePositionFromSubject(subject);
                // Try to get company from subject "at [Company]", fall back to From header
                companyName = parseCompanyFromSubject(subject);
                if (companyName == null) {
                    companyName = parseCompanyFromSender(from);
                }
            }
        }

        return GmailImportPreviewDTO.builder()
                .gmailMessageId(messageId)
                .subject(subject)
                .from(from)
                .companyName(companyName)
                .positionTitle(positionTitle)
                .appliedDate(appliedDate)
                .build();
    }

    private boolean isLinkedInEmail(String from) {
        if (from == null) return false;
        return from.toLowerCase().contains("@linkedin.com");
    }

    /**
     * Parses LinkedIn subject lines like "You applied to Software Engineer at Google".
     * Returns [positionTitle, companyName].
     */
    private String[] parseLinkedInSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            return new String[]{"Unknown Position", "LinkedIn"};
        }

        // Strip leading name prefix like "John, you applied to..."
        String cleaned = subject.replaceFirst("^[^,]+,\\s*", "");

        for (Pattern pattern : LINKEDIN_PATTERNS) {
            Matcher matcher = pattern.matcher(cleaned);
            if (matcher.find()) {
                String position = matcher.group(1).trim();
                String company = matcher.group(2).trim();
                if (!position.isEmpty() && !company.isEmpty()) {
                    return new String[]{position, company};
                }
            }
        }

        // Fallback: try original subject in case the name strip was wrong
        for (Pattern pattern : LINKEDIN_PATTERNS) {
            Matcher matcher = pattern.matcher(subject);
            if (matcher.find()) {
                String position = matcher.group(1).trim();
                String company = matcher.group(2).trim();
                if (!position.isEmpty() && !company.isEmpty()) {
                    return new String[]{position, company};
                }
            }
        }

        return new String[]{"Unknown Position", "LinkedIn"};
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
     * Tries to extract both position and company from subject in one pass.
     * e.g. "Thank you for applying to Software Engineer at Google"
     * Returns [position, company] or null if no match.
     */
    private String[] parsePositionAndCompanyFromSubject(String subject) {
        if (subject == null || subject.isBlank()) return null;

        for (Pattern pattern : SUBJECT_POSITION_AND_COMPANY_PATTERNS) {
            Matcher matcher = pattern.matcher(subject);
            if (matcher.find()) {
                String position = matcher.group(1).trim();
                String company = matcher.group(2).trim();
                if (!position.isEmpty() && !company.isEmpty()) {
                    return new String[]{position, company};
                }
            }
        }
        return null;
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
     * Tries to extract company name from "at [Company]" in the subject line.
     * Returns null if not found (caller should fall back to From header).
     */
    private String parseCompanyFromSubject(String subject) {
        if (subject == null || subject.isBlank()) return null;

        Matcher matcher = SUBJECT_COMPANY_PATTERN.matcher(subject);
        if (matcher.find()) {
            String company = matcher.group(1).trim();
            if (!company.isEmpty() && company.length() < 80) {
                return company;
            }
        }
        return null;
    }

    // The day the email arrived, on the user's calendar (an 11pm email in Denver is
    // already the next day in UTC)
    private static LocalDate parseDateFromHeader(Long internalDateMs, ZoneId userZone) {
        if (internalDateMs != null && internalDateMs > 0) {
            return Instant.ofEpochMilli(internalDateMs).atZone(userZone).toLocalDate();
        }
        return LocalDate.now(userZone);
    }
}
