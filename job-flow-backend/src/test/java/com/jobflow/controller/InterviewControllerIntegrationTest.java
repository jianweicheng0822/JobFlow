package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.model.InterviewType;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class InterviewControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private String aliceToken;
    private String bobToken;

    @BeforeEach
    void setUp() throws Exception {
        aliceToken = registerAndGetToken("Alice", "alice@test.com", "password123");
        bobToken = registerAndGetToken("Bob", "bob@test.com", "password123");
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

    private Long createCompany(String token) throws Exception {
        String json = """
                {"name": "TestCorp", "location": "NYC", "website": "https://testcorp.com"}
                """;
        MvcResult result = mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createApplication(String token, Long companyId) throws Exception {
        String json = String.format("""
                {"positionTitle": "Engineer", "companyId": %d, "location": "NYC", "salary": "$150k"}
                """, companyId);

        MvcResult result = mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createInterview(String token, Long appId, String dateTime) throws Exception {
        String json = String.format("""
                {"jobApplicationId": %d, "interviewDate": "%s", "interviewType": "PHONE", "notes": "Initial screen"}
                """, appId, dateTime);

        MvcResult result = mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void createInterview_returns201() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);

        String json = String.format("""
                {"jobApplicationId": %d, "interviewDate": "2030-06-15T10:00:00", "interviewType": "PHONE", "notes": "First round"}
                """, appId);

        mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.jobApplicationId").value(appId))
                .andExpect(jsonPath("$.interviewType").value("PHONE"))
                .andExpect(jsonPath("$.notes").value("First round"))
                .andExpect(jsonPath("$.companyName").value("TestCorp"));
    }

    @Test
    void createInterview_forOtherUsersApp_fails() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long aliceAppId = createApplication(aliceToken, companyId);

        // Bob tries to create an interview for Alice's application
        String json = String.format("""
                {"jobApplicationId": %d, "interviewDate": "2030-06-15T10:00:00", "interviewType": "PHONE", "notes": "Sneaky"}
                """, aliceAppId);

        mockMvc.perform(post("/api/interviews")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAll_returnsOnlyOwnInterviews() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long aliceApp = createApplication(aliceToken, companyId);
        Long bobApp = createApplication(bobToken, companyId);

        createInterview(aliceToken, aliceApp, "2030-06-15T10:00:00");
        createInterview(aliceToken, aliceApp, "2030-06-16T10:00:00");
        createInterview(bobToken, bobApp, "2030-06-17T10:00:00");

        // Alice sees 2
        mockMvc.perform(get("/api/interviews")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // Bob sees 1
        mockMvc.perform(get("/api/interviews")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void getById_cannotAccessOtherUsersInterview() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long aliceApp = createApplication(aliceToken, companyId);
        Long interviewId = createInterview(aliceToken, aliceApp, "2030-06-15T10:00:00");

        // Bob tries to access Alice's interview
        mockMvc.perform(get("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUpcoming_returnsOnlyFutureInterviews() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);

        // Past interview
        createInterview(aliceToken, appId, "2020-01-01T10:00:00");
        // Future interview
        createInterview(aliceToken, appId, "2030-12-31T10:00:00");

        mockMvc.perform(get("/api/interviews/upcoming")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].interviewDate", containsString("2030")));
    }

    @Test
    void update_canUpdateOwnInterview() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);
        Long interviewId = createInterview(aliceToken, appId, "2030-06-15T10:00:00");

        String updateJson = String.format("""
                {"jobApplicationId": %d, "interviewDate": "2030-07-01T14:00:00", "interviewType": "ONSITE", "notes": "Updated notes"}
                """, appId);

        mockMvc.perform(put("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interviewType").value("ONSITE"))
                .andExpect(jsonPath("$.notes").value("Updated notes"));
    }

    @Test
    void update_cannotModifyOtherUsersInterview() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long aliceApp = createApplication(aliceToken, companyId);
        Long interviewId = createInterview(aliceToken, aliceApp, "2030-06-15T10:00:00");

        String updateJson = """
                {"interviewType": "ONSITE", "notes": "Hacked"}
                """;

        // Bob tries to update Alice's interview
        mockMvc.perform(put("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_canDeleteOwnInterview() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);
        Long interviewId = createInterview(aliceToken, appId, "2030-06-15T10:00:00");

        mockMvc.perform(delete("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNoContent());

        // Verify it's gone
        mockMvc.perform(get("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_cannotDeleteOtherUsersInterview() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long aliceApp = createApplication(aliceToken, companyId);
        Long interviewId = createInterview(aliceToken, aliceApp, "2030-06-15T10:00:00");

        // Bob tries to delete Alice's interview
        mockMvc.perform(delete("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNotFound());

        // Alice can still see it
        mockMvc.perform(get("/api/interviews/" + interviewId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());
    }

    @Test
    void createInterview_withoutAuth_returns401() throws Exception {
        String json = """
                {"jobApplicationId": 1, "interviewDate": "2030-06-15T10:00:00", "interviewType": "PHONE", "notes": "No auth"}
                """;

        mockMvc.perform(post("/api/interviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }
}
