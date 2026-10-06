package com.jobflow.service;

import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpResponseException;
import com.google.api.services.gmail.Gmail;
import com.google.auth.oauth2.AccessToken;
import com.jobflow.exception.ExternalServiceException;
import com.jobflow.exception.NotFoundException;
import com.jobflow.model.*;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GmailServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CompanyService companyService;
    @Mock
    private JobApplicationRepository jobApplicationRepository;
    @Mock
    private EmailImportLogRepository emailImportLogRepository;

    @InjectMocks
    private GmailService gmailService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .provider(AuthProvider.GOOGLE)
                .gmailConnected(true)
                .googleAccessToken("fake-token")
                .googleRefreshToken("fake-refresh")
                .build();
    }

    // ============================
    // scanEmails - precondition tests
    // ============================

    @Test
    void scanEmails_userNotFound_throwsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gmailService.scanEmails(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void scanEmails_gmailNotConnected_throwsException() {
        testUser.setGmailConnected(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> gmailService.scanEmails(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Gmail is not connected");
    }

    @Test
    void scanEmails_noAccessToken_throwsException() {
        testUser.setGoogleAccessToken(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> gmailService.scanEmails(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Gmail is not connected");
    }

    // ============================
    // importApplications
    // ============================

    @Test
    void importApplications_userNotFound_throwsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of());

        assertThatThrownBy(() -> gmailService.importApplications(99L, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void importApplications_importsNewApplications() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(false);
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg2")).thenReturn(false);

        Company company = Company.builder().id(10L).name("Google").build();
        when(companyService.findOrCreateByName(testUser, "Google")).thenReturn(company);
        Company metaCompany = Company.builder().id(11L).name("Meta").build();
        when(companyService.findOrCreateByName(testUser, "Meta")).thenReturn(metaCompany);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            app.setId(100L);
            return app;
        });

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", "SWE", LocalDate.of(2026, 9, 1)),
                new GmailImportConfirmRequest.ImportItem("msg2", "Meta", "PM", LocalDate.of(2026, 9, 2))
        ));

        GmailImportResultDTO result = gmailService.importApplications(1L, request);

        assertThat(result.getImportedCount()).isEqualTo(2);
        assertThat(result.getSkippedCount()).isEqualTo(0);
        verify(jobApplicationRepository, times(2)).save(any(JobApplication.class));
        verify(emailImportLogRepository, times(2)).save(any(EmailImportLog.class));
    }

    @Test
    void importApplications_skipsDuplicates() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(true);

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", "SWE", LocalDate.of(2026, 9, 1))
        ));

        GmailImportResultDTO result = gmailService.importApplications(1L, request);

        assertThat(result.getImportedCount()).isEqualTo(0);
        assertThat(result.getSkippedCount()).isEqualTo(1);
        verify(jobApplicationRepository, never()).save(any());
    }

    @Test
    void importApplications_nullCompanyName_defaultsToUnknown() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(false);

        Company unknownCompany = Company.builder().id(12L).name("Unknown").build();
        when(companyService.findOrCreateByName(testUser, "Unknown")).thenReturn(unknownCompany);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            app.setId(101L);
            return app;
        });

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", null, "SWE", null)
        ));

        GmailImportResultDTO result = gmailService.importApplications(1L, request);

        assertThat(result.getImportedCount()).isEqualTo(1);
        verify(companyService).findOrCreateByName(testUser, "Unknown");
    }

    @Test
    void importApplications_nullPositionTitle_defaultsToUnknownPosition() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(false);
        Company company = Company.builder().id(10L).name("Google").build();
        when(companyService.findOrCreateByName(testUser, "Google")).thenReturn(company);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            app.setId(102L);
            assertThat(app.getPositionTitle()).isEqualTo("Unknown Position");
            return app;
        });

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", null, LocalDate.of(2026, 9, 1))
        ));

        gmailService.importApplications(1L, request);
    }

    @Test
    void importApplications_nullAppliedDate_defaultsToToday() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(false);
        Company company = Company.builder().id(10L).name("Google").build();
        when(companyService.findOrCreateByName(testUser, "Google")).thenReturn(company);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            app.setId(103L);
            assertThat(app.getAppliedDate()).isEqualTo(LocalDate.now());
            return app;
        });

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", "SWE", null)
        ));

        gmailService.importApplications(1L, request);
    }

    @Test
    void importApplications_mixedNewAndDuplicate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg1")).thenReturn(true);
        when(emailImportLogRepository.existsByUserIdAndGmailMessageId(1L, "msg2")).thenReturn(false);
        Company company = Company.builder().id(10L).name("Google").build();
        when(companyService.findOrCreateByName(testUser, "Google")).thenReturn(company);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication app = inv.getArgument(0);
            app.setId(104L);
            return app;
        });

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", "SWE", LocalDate.of(2026, 9, 1)),
                new GmailImportConfirmRequest.ImportItem("msg2", "Google", "PM", LocalDate.of(2026, 9, 2))
        ));

        GmailImportResultDTO result = gmailService.importApplications(1L, request);

        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(1);
    }

    // ============================
    // Private parsing methods (via reflection)
    // ============================

    @Nested
    class EmailParsingTests {

        // Helper to invoke private methods
        private Object invoke(String methodName, Class<?>[] paramTypes, Object... args) throws Exception {
            Method method = GmailService.class.getDeclaredMethod(methodName, paramTypes);
            method.setAccessible(true);
            return method.invoke(gmailService, args);
        }

        // --- isLinkedInEmail ---

        @Test
        void isLinkedInEmail_linkedInAddress_returnsTrue() throws Exception {
            boolean result = (boolean) invoke("isLinkedInEmail",
                    new Class[]{String.class}, "jobs-noreply@linkedin.com");
            assertThat(result).isTrue();
        }

        @Test
        void isLinkedInEmail_otherAddress_returnsFalse() throws Exception {
            boolean result = (boolean) invoke("isLinkedInEmail",
                    new Class[]{String.class}, "noreply@google.com");
            assertThat(result).isFalse();
        }

        @Test
        void isLinkedInEmail_null_returnsFalse() throws Exception {
            boolean result = (boolean) invoke("isLinkedInEmail",
                    new Class[]{String.class}, (Object) null);
            assertThat(result).isFalse();
        }

        // --- parseLinkedInSubject ---

        @Test
        void parseLinkedInSubject_standardFormat() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, "You applied to Software Engineer at Google");
            assertThat(result[0]).isEqualTo("Software Engineer");
            assertThat(result[1]).isEqualTo("Google");
        }

        @Test
        void parseLinkedInSubject_withNamePrefix() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, "John, you applied to Data Scientist at Meta");
            assertThat(result[0]).isEqualTo("Data Scientist");
            assertThat(result[1]).isEqualTo("Meta");
        }

        @Test
        void parseLinkedInSubject_yourApplicationFormat() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, "Your application to Backend Developer at Amazon");
            assertThat(result[0]).isEqualTo("Backend Developer");
            assertThat(result[1]).isEqualTo("Amazon");
        }

        @Test
        void parseLinkedInSubject_nullSubject_returnsDefaults() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, (Object) null);
            assertThat(result[0]).isEqualTo("Unknown Position");
            assertThat(result[1]).isEqualTo("LinkedIn");
        }

        @Test
        void parseLinkedInSubject_blankSubject_returnsDefaults() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, "   ");
            assertThat(result[0]).isEqualTo("Unknown Position");
            assertThat(result[1]).isEqualTo("LinkedIn");
        }

        @Test
        void parseLinkedInSubject_unrecognizedFormat_returnsDefaults() throws Exception {
            String[] result = (String[]) invoke("parseLinkedInSubject",
                    new Class[]{String.class}, "Weekly job digest");
            assertThat(result[0]).isEqualTo("Unknown Position");
            assertThat(result[1]).isEqualTo("LinkedIn");
        }

        // --- parseCompanyFromSender ---

        @Test
        void parseCompanyFromSender_displayNameAndEmail() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "Acme Corp <noreply@acme.com>");
            assertThat(result).isEqualTo("Acme Corp");
        }

        @Test
        void parseCompanyFromSender_removesRecruitingSuffix() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "Google Recruiting <noreply@google.com>");
            assertThat(result).isEqualTo("Google");
        }

        @Test
        void parseCompanyFromSender_removesCareersSuffix() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "Meta Careers <careers@meta.com>");
            assertThat(result).isEqualTo("Meta");
        }

        @Test
        void parseCompanyFromSender_quotedDisplayName() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "\"Amazon Jobs\" <noreply@amazon.com>");
            assertThat(result).isEqualTo("Amazon");
        }

        @Test
        void parseCompanyFromSender_noDisplayName_usesDomain() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "<noreply@stripe.com>");
            assertThat(result).isEqualTo("Stripe");
        }

        @Test
        void parseCompanyFromSender_null_returnsUnknown() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, (Object) null);
            assertThat(result).isEqualTo("Unknown");
        }

        @Test
        void parseCompanyFromSender_blank_returnsUnknown() throws Exception {
            String result = (String) invoke("parseCompanyFromSender",
                    new Class[]{String.class}, "  ");
            assertThat(result).isEqualTo("Unknown");
        }

        // --- parsePositionAndCompanyFromSubject ---

        @Test
        void parsePositionAndCompanyFromSubject_applyingToFormat() throws Exception {
            String[] result = (String[]) invoke("parsePositionAndCompanyFromSubject",
                    new Class[]{String.class}, "Thank you for applying to Software Engineer at Google");
            assertThat(result).isNotNull();
            assertThat(result[0]).isEqualTo("Software Engineer");
            assertThat(result[1]).isEqualTo("Google");
        }

        @Test
        void parsePositionAndCompanyFromSubject_applicationForFormat() throws Exception {
            String[] result = (String[]) invoke("parsePositionAndCompanyFromSubject",
                    new Class[]{String.class}, "Your application for Data Analyst at Meta has been received");
            assertThat(result).isNotNull();
            assertThat(result[0]).isEqualTo("Data Analyst");
            assertThat(result[1]).isEqualTo("Meta");
        }

        @Test
        void parsePositionAndCompanyFromSubject_noMatch_returnsNull() throws Exception {
            String[] result = (String[]) invoke("parsePositionAndCompanyFromSubject",
                    new Class[]{String.class}, "Weekly newsletter");
            assertThat(result).isNull();
        }

        @Test
        void parsePositionAndCompanyFromSubject_null_returnsNull() throws Exception {
            String[] result = (String[]) invoke("parsePositionAndCompanyFromSubject",
                    new Class[]{String.class}, (Object) null);
            assertThat(result).isNull();
        }

        // --- parsePositionFromSubject ---

        @Test
        void parsePositionFromSubject_positionKeyword() throws Exception {
            String result = (String) invoke("parsePositionFromSubject",
                    new Class[]{String.class}, "Thank you for the Software Engineer position");
            assertThat(result).isEqualTo("Software Engineer");
        }

        @Test
        void parsePositionFromSubject_applicationFor() throws Exception {
            String result = (String) invoke("parsePositionFromSubject",
                    new Class[]{String.class}, "Application for Product Manager at Stripe");
            assertThat(result).isEqualTo("Product Manager");
        }

        @Test
        void parsePositionFromSubject_noMatch_returnsUnknown() throws Exception {
            String result = (String) invoke("parsePositionFromSubject",
                    new Class[]{String.class}, "Hello there");
            assertThat(result).isEqualTo("Unknown Position");
        }

        @Test
        void parsePositionFromSubject_null_returnsUnknown() throws Exception {
            String result = (String) invoke("parsePositionFromSubject",
                    new Class[]{String.class}, (Object) null);
            assertThat(result).isEqualTo("Unknown Position");
        }

        // --- parseCompanyFromSubject ---

        @Test
        void parseCompanyFromSubject_atCompany() throws Exception {
            String result = (String) invoke("parseCompanyFromSubject",
                    new Class[]{String.class}, "Application received at Google");
            assertThat(result).isEqualTo("Google");
        }

        @Test
        void parseCompanyFromSubject_noMatch_returnsNull() throws Exception {
            String result = (String) invoke("parseCompanyFromSubject",
                    new Class[]{String.class}, "Your application was received");
            assertThat(result).isNull();
        }

        @Test
        void parseCompanyFromSubject_null_returnsNull() throws Exception {
            String result = (String) invoke("parseCompanyFromSubject",
                    new Class[]{String.class}, (Object) null);
            assertThat(result).isNull();
        }

        // --- parseDateFromHeader ---

        @Test
        void parseDateFromHeader_validTimestamp() throws Exception {
            // 2026-09-15 in millis (approximate)
            long timestamp = LocalDate.of(2026, 9, 15)
                    .atStartOfDay(ZoneId.systemDefault())
                    .toInstant().toEpochMilli();

            LocalDate result = (LocalDate) invoke("parseDateFromHeader",
                    new Class[]{String.class, Long.class}, null, timestamp);
            assertThat(result).isEqualTo(LocalDate.of(2026, 9, 15));
        }

        @Test
        void parseDateFromHeader_nullTimestamp_returnsToday() throws Exception {
            LocalDate result = (LocalDate) invoke("parseDateFromHeader",
                    new Class[]{String.class, Long.class}, null, null);
            assertThat(result).isEqualTo(LocalDate.now());
        }

        @Test
        void parseDateFromHeader_zeroTimestamp_returnsToday() throws Exception {
            LocalDate result = (LocalDate) invoke("parseDateFromHeader",
                    new Class[]{String.class, Long.class}, null, 0L);
            assertThat(result).isEqualTo(LocalDate.now());
        }
    }

    // ============================
    // scanEmails - Gmail API failures
    // ============================

    private static GoogleJsonResponseException googleError(int status) {
        return new GoogleJsonResponseException(
                new HttpResponseException.Builder(status, "Google says no: secret internal detail", new HttpHeaders()), null);
    }

    // Spy so we can hand scanEmails a fake Gmail client
    private GmailService serviceWithGmail(Gmail gmail) throws Exception {
        GmailService spyService = spy(gmailService);
        doReturn(gmail).when(spyService).buildGmailClient(any());
        return spyService;
    }

    @Test
    void scanEmails_tokenStillRejectedAfterRefresh_retriesOnlyOnce() throws Exception {
        Gmail gmail = mock(Gmail.class, RETURNS_DEEP_STUBS);
        when(gmail.users().messages().list("me").setQ(anyString()).setMaxResults(anyLong()).execute())
                .thenThrow(googleError(401));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        GmailService service = serviceWithGmail(gmail);
        doNothing().when(service).refreshAccessToken(any());

        assertThatThrownBy(() -> service.scanEmails(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("re-link your Google account");

        // One refresh, two attempts total, then we give up instead of looping
        verify(service, times(1)).refreshAccessToken(any());
        verify(service, times(2)).buildGmailClient(any());
    }

    @Test
    void scanEmails_gmailApiError_throwsExternalServiceWithoutGoogleDetails() throws Exception {
        Gmail gmail = mock(Gmail.class, RETURNS_DEEP_STUBS);
        when(gmail.users().messages().list("me").setQ(anyString()).setMaxResults(anyLong()).execute())
                .thenThrow(googleError(500));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        GmailService service = serviceWithGmail(gmail);

        assertThatThrownBy(() -> service.scanEmails(1L))
                .isInstanceOf(ExternalServiceException.class)
                .hasMessage("Couldn't reach Gmail. Please try again in a moment.");
        verify(service, never()).refreshAccessToken(any());
    }

    @Test
    void scanEmails_networkError_throwsExternalService() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        GmailService service = spy(gmailService);
        doThrow(new IOException("connection reset")).when(service).buildGmailClient(any());

        assertThatThrownBy(() -> service.scanEmails(1L))
                .isInstanceOf(ExternalServiceException.class)
                .hasMessage("Couldn't reach Gmail. Please try again in a moment.");
    }

    @Test
    void refreshAccessToken_noRefreshToken_asksUserToRelink() {
        testUser.setGoogleRefreshToken(null);

        assertThatThrownBy(() -> gmailService.refreshAccessToken(testUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("re-link your Google account");
    }

    // ============================
    // refreshAccessToken - when to unlink Gmail
    // ============================

    private static IOException tokenEndpointError(int status, String body) {
        HttpResponseException http = new HttpResponseException.Builder(status, "error", new HttpHeaders())
                .setContent(body).build();
        // Mirrors the auth library, which wraps the HTTP error in an IOException
        return new IOException("Error getting access token for service account", http);
    }

    @Test
    void refreshAccessToken_success_storesNewTokenAndStaysConnected() throws Exception {
        GmailService service = spy(gmailService);
        doReturn(new AccessToken("fresh-token", null)).when(service).fetchNewAccessToken("fake-refresh");

        service.refreshAccessToken(testUser);

        assertThat(testUser.getGoogleAccessToken()).isEqualTo("fresh-token");
        assertThat(testUser.isGmailConnected()).isTrue();
        verify(userRepository).save(testUser);
    }

    @Test
    void refreshAccessToken_invalidGrant_unlinksAndAsksToRelink() throws Exception {
        GmailService service = spy(gmailService);
        doThrow(tokenEndpointError(400, "{\"error\":\"invalid_grant\"}")).when(service).fetchNewAccessToken(anyString());

        assertThatThrownBy(() -> service.refreshAccessToken(testUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("re-link your Google account");

        assertThat(testUser.isGmailConnected()).isFalse();
        verify(userRepository).save(testUser);
    }

    @Test
    void refreshAccessToken_networkError_keepsGmailLinked() throws Exception {
        GmailService service = spy(gmailService);
        doThrow(new IOException("Connection timed out")).when(service).fetchNewAccessToken(anyString());

        assertThatThrownBy(() -> service.refreshAccessToken(testUser))
                .isInstanceOf(ExternalServiceException.class)
                .hasMessage("Couldn't reach Gmail. Please try again in a moment.");

        // A blip must not force the user to re-link
        assertThat(testUser.isGmailConnected()).isTrue();
        verify(userRepository, never()).save(any());
    }

    @Test
    void refreshAccessToken_googleOutage_keepsGmailLinked() throws Exception {
        GmailService service = spy(gmailService);
        doThrow(tokenEndpointError(503, "Service Unavailable")).when(service).fetchNewAccessToken(anyString());

        assertThatThrownBy(() -> service.refreshAccessToken(testUser))
                .isInstanceOf(ExternalServiceException.class);

        assertThat(testUser.isGmailConnected()).isTrue();
        verify(userRepository, never()).save(any());
    }

    @Test
    void scanEmails_refreshHitsNetworkError_returns502AndStaysLinked() throws Exception {
        Gmail gmail = mock(Gmail.class, RETURNS_DEEP_STUBS);
        when(gmail.users().messages().list("me").setQ(anyString()).setMaxResults(anyLong()).execute())
                .thenThrow(googleError(401));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        GmailService service = serviceWithGmail(gmail);
        doThrow(new IOException("Connection reset")).when(service).fetchNewAccessToken(anyString());

        assertThatThrownBy(() -> service.scanEmails(1L))
                .isInstanceOf(ExternalServiceException.class);
        assertThat(testUser.isGmailConnected()).isTrue();
    }
}
