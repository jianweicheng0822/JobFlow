package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CompanyControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("Alice", "alice@test.com", "password123");
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

    private Long createCompany(String token, String name, String location, String website) throws Exception {
        String json = String.format("""
                {"name": "%s", "location": "%s", "website": "%s"}
                """, name, location, website);

        MvcResult result = mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void createCompany_returns201() throws Exception {
        String json = """
                {"name": "Acme Inc", "location": "San Francisco", "website": "https://acme.com"}
                """;

        mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Acme Inc"))
                .andExpect(jsonPath("$.location").value("San Francisco"))
                .andExpect(jsonPath("$.website").value("https://acme.com"));
    }

    @Test
    void getAll_returnsAllCompanies() throws Exception {
        createCompany(token, "Company A", "NYC", "https://a.com");
        createCompany(token, "Company B", "LA", "https://b.com");

        mockMvc.perform(get("/api/companies")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Company A"))
                .andExpect(jsonPath("$[1].name").value("Company B"));
    }

    @Test
    void getById_returnsCompany() throws Exception {
        Long companyId = createCompany(token, "TargetCo", "Boston", "https://target.com");

        mockMvc.perform(get("/api/companies/" + companyId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(companyId))
                .andExpect(jsonPath("$.name").value("TargetCo"))
                .andExpect(jsonPath("$.location").value("Boston"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        mockMvc.perform(get("/api/companies/99999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_modifiesCompany() throws Exception {
        Long companyId = createCompany(token, "OldName", "OldCity", "https://old.com");

        String updateJson = """
                {"name": "NewName", "location": "NewCity", "website": "https://new.com"}
                """;

        mockMvc.perform(put("/api/companies/" + companyId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("NewName"))
                .andExpect(jsonPath("$.location").value("NewCity"))
                .andExpect(jsonPath("$.website").value("https://new.com"));
    }

    @Test
    void delete_removesCompany() throws Exception {
        Long companyId = createCompany(token, "ToDelete", "Anywhere", "https://delete.com");

        mockMvc.perform(delete("/api/companies/" + companyId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify it's gone
        mockMvc.perform(get("/api/companies/" + companyId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createCompany_withoutAuth_returns401() throws Exception {
        String json = """
                {"name": "NoAuth Corp", "location": "Nowhere", "website": "https://noauth.com"}
                """;

        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }
}
