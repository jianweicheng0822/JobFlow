package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PagedSearchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        String body = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alice\",\"email\":\"alice@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        token = objectMapper.readTree(body).get("token").asText();

        create("Backend Engineer", "Acme");
        create("100% Remote Developer", "Globex");
        create("Data_Engineer", "Initech");
        create("Hire me!", "Umbrella");
    }

    private void create(String title, String company) throws Exception {
        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("positionTitle", title, "companyName", company))))
                .andExpect(status().isCreated());
    }

    // "k=v&k=v" sent as real query params (a URL template would re-encode a "%")
    private ResultActions page(String query) throws Exception {
        var request = get("/api/applications/page").header("Authorization", "Bearer " + token);
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            request.param(kv[0], kv[1]);
        }
        return mockMvc.perform(request);
    }

    // --- Search treats wildcard characters literally ---

    @Test
    void percentSign_matchesOnlyTitlesWithAPercentSign() throws Exception {
        page("keyword=%")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].positionTitle", contains("100% Remote Developer")));
    }

    @Test
    void underscore_matchesOnlyTitlesWithAnUnderscore() throws Exception {
        page("keyword=_")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].positionTitle", contains("Data_Engineer")));
    }

    @Test
    void theEscapeCharacterItself_isLiteralToo() throws Exception {
        page("keyword=!")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].positionTitle", contains("Hire me!")));
    }

    @Test
    void ordinarySearch_stillMatchesTitleOrCompany() throws Exception {
        page("keyword=engineer&sortBy=companyName&sortDir=asc")
                .andExpect(jsonPath("$.content[*].positionTitle", contains("Backend Engineer", "Data_Engineer")));
        page("keyword=globex")
                .andExpect(jsonPath("$.content[*].positionTitle", contains("100% Remote Developer")));
    }

    // --- Paging limits ---

    @Test
    void sizeOverTheCap_is400() throws Exception {
        page("size=100000")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_VALUE"))
                .andExpect(jsonPath("$.params.field").value("size"));
    }

    @Test
    void zeroSizeOrNegativePage_is400() throws Exception {
        page("size=0").andExpect(status().isBadRequest()).andExpect(jsonPath("$.params.field").value("size"));
        page("page=-1").andExpect(status().isBadRequest()).andExpect(jsonPath("$.params.field").value("page"));
    }

    @Test
    void sizeAtTheCap_isFine() throws Exception {
        page("size=100")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(4));
    }
}
