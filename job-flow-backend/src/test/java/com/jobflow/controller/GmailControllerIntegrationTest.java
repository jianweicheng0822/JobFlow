package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.model.User;
import com.jobflow.repository.OneTimeCodeRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import com.jobflow.service.GmailService;
import com.jobflow.service.OneTimeCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Non-default URLs, so the tests prove they come from config rather than hard-coded dev values
@TestPropertySource(properties = {
        "app.frontend-url=https://jobflow.example",
        "app.gmail.redirect-uri=https://jobflow.example/api/gmail/callback",
        "app.oauth.google.client-id=test-google-id",
        "app.oauth.google.client-secret=test-google-secret"
})
class GmailControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OneTimeCodeService oneTimeCodeService;

    @Autowired
    private OneTimeCodeRepository oneTimeCodeRepository;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockBean
    private GmailService gmailService;

    private String aliceToken;

    @BeforeEach
    void setUp() throws Exception {
        aliceToken = registerAndGetToken("Alice", "alice@test.com", "password123");
    }

    private String registerAndGetToken(String name, String email, String password) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName(name);
        req.setEmail(email);
        req.setPassword(password);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    // --- GET /api/gmail/status ---

    @Test
    void getStatus_returnsGmailConnectionStatus() throws Exception {
        mockMvc.perform(get("/api/gmail/status")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gmailConnected").value(false))
                .andExpect(jsonPath("$.provider").value("LOCAL"));
    }

    @Test
    void getStatus_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/gmail/status"))
                .andExpect(status().isUnauthorized());
    }

    // --- GET /api/gmail/link ---

    @Test
    void getLink_returnsAuthUrl() throws Exception {
        mockMvc.perform(get("/api/gmail/link")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authUrl").isString())
                .andExpect(jsonPath("$.authUrl", containsString("accounts.google.com")))
                .andExpect(jsonPath("$.authUrl",
                        containsString("redirect_uri=https%3A%2F%2Fjobflow.example%2Fapi%2Fgmail%2Fcallback")))
                .andExpect(jsonPath("$.authUrl", containsString("client_id=test-google-id")));
    }

    @Test
    void getLink_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/gmail/link"))
                .andExpect(status().isUnauthorized());
    }

    // --- POST /api/gmail/scan ---

    @Test
    void scan_returnsPreviews() throws Exception {
        List<GmailImportPreviewDTO> previews = List.of(
                GmailImportPreviewDTO.builder()
                        .gmailMessageId("msg1")
                        .subject("Thank you for applying to SWE at Google")
                        .from("Google <noreply@google.com>")
                        .companyName("Google")
                        .positionTitle("SWE")
                        .appliedDate(LocalDate.of(2026, 9, 1))
                        .build()
        );
        when(gmailService.scanEmails(anyLong())).thenReturn(previews);

        mockMvc.perform(post("/api/gmail/scan")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].gmailMessageId").value("msg1"))
                .andExpect(jsonPath("$[0].companyName").value("Google"))
                .andExpect(jsonPath("$[0].positionTitle").value("SWE"));
    }

    @Test
    void scan_emptyResult() throws Exception {
        when(gmailService.scanEmails(anyLong())).thenReturn(List.of());

        mockMvc.perform(post("/api/gmail/scan")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void scan_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/gmail/scan"))
                .andExpect(status().isUnauthorized());
    }

    // --- POST /api/gmail/import ---

    @Test
    void importApplications_returnsResult() throws Exception {
        GmailImportResultDTO resultDTO = GmailImportResultDTO.builder()
                .importedCount(2)
                .skippedCount(1)
                .build();
        when(gmailService.importApplications(anyLong(), any(GmailImportConfirmRequest.class)))
                .thenReturn(resultDTO);

        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of(
                new GmailImportConfirmRequest.ImportItem("msg1", "Google", "SWE", LocalDate.of(2026, 9, 1)),
                new GmailImportConfirmRequest.ImportItem("msg2", "Meta", "PM", LocalDate.of(2026, 9, 2)),
                new GmailImportConfirmRequest.ImportItem("msg3", "Google", "SWE", LocalDate.of(2026, 9, 1))
        ));

        mockMvc.perform(post("/api/gmail/import")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(2))
                .andExpect(jsonPath("$.skippedCount").value(1));
    }

    @Test
    void importApplications_withoutAuth_returns401() throws Exception {
        GmailImportConfirmRequest request = new GmailImportConfirmRequest();
        request.setItems(List.of());

        mockMvc.perform(post("/api/gmail/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // --- GET /api/gmail/callback ---

    @Test
    void callback_invalidState_redirectsWithError() throws Exception {
        mockMvc.perform(get("/api/gmail/callback")
                        .param("code", "fake-code")
                        .param("state", "invalid-state"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=invalid_state"));
    }

    // The old flow put the user's JWT in "state"; a JWT must not work as a state anymore
    @Test
    void callback_jwtAsState_isRejected() throws Exception {
        mockMvc.perform(get("/api/gmail/callback")
                        .param("code", "fake-code")
                        .param("state", aliceToken))
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=invalid_state"));
    }

    @Test
    void getLink_stateIsOneTimeCodeNotJwt() throws Exception {
        String state = linkState();

        assertThat(state).isNotEqualTo(aliceToken).doesNotContain(".");
        assertThat(oneTimeCodeRepository.count()).isEqualTo(1);
    }

    @Test
    void callback_expiredState_isRejected() throws Exception {
        User alice = userRepository.findByEmail("alice@test.com").orElseThrow();
        String state = oneTimeCodeService.issue(alice, OneTimeCodePurpose.GMAIL_LINK, Duration.ofSeconds(-1));

        mockMvc.perform(get("/api/gmail/callback").param("code", "fake-code").param("state", state))
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=invalid_state"));
    }

    // A login code can't be replayed as a Gmail link state
    @Test
    void callback_loginCodeAsState_isRejected() throws Exception {
        User alice = userRepository.findByEmail("alice@test.com").orElseThrow();
        String loginCode = oneTimeCodeService.issue(alice, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));

        mockMvc.perform(get("/api/gmail/callback").param("code", "fake-code").param("state", loginCode))
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=invalid_state"));
    }

    // "Cancel" on Google's consent screen sends error=access_denied and no code
    @Test
    void callback_userDenied_redirectsFriendly() throws Exception {
        String state = linkState();

        mockMvc.perform(get("/api/gmail/callback")
                        .param("error", "access_denied")
                        .param("state", state))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=access_denied"));
    }

    @Test
    void callback_withoutAnyParams_redirectsInsteadOf400() throws Exception {
        mockMvc.perform(get("/api/gmail/callback"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("https://jobflow.example/settings?gmailLinked=false&error=access_denied"));
    }

    private String linkState() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/gmail/link")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();
        String authUrl = objectMapper.readTree(result.getResponse().getContentAsString()).get("authUrl").asText();
        return UriComponentsBuilder.fromUriString(authUrl).build(true).getQueryParams().getFirst("state");
    }
}
