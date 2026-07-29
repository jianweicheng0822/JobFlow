package com.jobflow.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.RegisterRequest;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class JobApplicationControllerIntegrationTest {

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

    @Test
    void createApplication_returns201() throws Exception {
        Long companyId = createCompany(aliceToken);

        String json = String.format("""
                {"positionTitle": "Engineer", "companyId": %d, "location": "NYC"}
                """, companyId);

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.positionTitle").value("Engineer"))
                .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    void getAll_returnsOnlyOwnApplications() throws Exception {
        Long companyId = createCompany(aliceToken);
        createApplication(aliceToken, companyId);
        createApplication(aliceToken, companyId);
        createApplication(bobToken, companyId);

        // Alice should see 2
        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // Bob should see 1
        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void getById_cannotAccessOtherUsersApplication() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);

        // Bob tries to access Alice's application
        mockMvc.perform(get("/api/applications/" + appId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_cannotModifyOtherUsersApplication() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);

        String updateJson = """
                {"positionTitle": "Hacked Title"}
                """;

        // Bob tries to update Alice's application
        mockMvc.perform(put("/api/applications/" + appId)
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_cannotDeleteOtherUsersApplication() throws Exception {
        Long companyId = createCompany(aliceToken);
        Long appId = createApplication(aliceToken, companyId);

        // Bob tries to delete Alice's application
        mockMvc.perform(delete("/api/applications/" + appId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNotFound());

        // Alice can still see it
        mockMvc.perform(get("/api/applications/" + appId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());
    }

    @Test
    void stats_returnsOnlyOwnStats() throws Exception {
        Long companyId = createCompany(aliceToken);
        createApplication(aliceToken, companyId);
        createApplication(aliceToken, companyId);
        createApplication(bobToken, companyId);

        // Alice's stats should show 2 total
        mockMvc.perform(get("/api/applications/stats")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(2));

        // Bob's stats should show 1 total
        mockMvc.perform(get("/api/applications/stats")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(1));
    }
}
