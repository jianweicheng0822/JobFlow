package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.GmailImportConfirmRequest;
import com.jobflow.dto.GmailImportPreviewDTO;
import com.jobflow.dto.GmailImportResultDTO;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import com.jobflow.service.GmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GmailControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

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
                .andExpect(jsonPath("$.authUrl", containsString("accounts.google.com")));
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
                        .param("state", "invalid-jwt-token"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/settings?gmailLinked=false*"));
    }
}
