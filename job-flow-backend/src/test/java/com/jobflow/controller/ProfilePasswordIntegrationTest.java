package com.jobflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.JwtService;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProfilePasswordIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

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

    // --- Profile update tests ---

    @Test
    void updateProfile_changesNameAndFields() throws Exception {
        String json = """
                {"name": "Alice Updated", "jobTitle": "Senior Engineer", "bio": "I build things"}
                """;

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Updated"))
                .andExpect(jsonPath("$.jobTitle").value("Senior Engineer"))
                .andExpect(jsonPath("$.bio").value("I build things"));
    }

    @Test
    void updateProfile_returnsUpdatedFields() throws Exception {
        String json = """
                {"name": "NewName", "jobTitle": "PM", "bio": "Managing products"}
                """;

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());

        // Verify via /me endpoint
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("NewName"))
                .andExpect(jsonPath("$.jobTitle").value("PM"))
                .andExpect(jsonPath("$.bio").value("Managing products"));
    }

    // --- Password change tests ---

    @Test
    void changePassword_withCorrectCurrent_succeeds() throws Exception {
        String json = """
                {"currentPassword": "password123", "newPassword": "newpass456"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNoContent());

        // Verify can login with new password
        String loginJson = """
                {"email": "alice@test.com", "password": "newpass456"}
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void changePassword_withWrongCurrent_fails() throws Exception {
        String json = """
                {"currentPassword": "wrongpassword", "newPassword": "newpass456"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_tooShort_fails() throws Exception {
        String json = """
                {"currentPassword": "password123", "newPassword": "short"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    // --- OAuth user password tests ---

    @Test
    void oauthUser_canSetPasswordWithoutCurrent() throws Exception {
        // Create an OAuth user directly (null password)
        User oauthUser = User.builder()
                .name("OAuthUser")
                .email("oauth@test.com")
                .password(null)
                .provider(AuthProvider.GOOGLE)
                .providerId("google-123")
                .build();
        userRepository.save(oauthUser);

        String oauthToken = jwtService.generateToken("oauth@test.com");

        // Set password without providing currentPassword
        String json = """
                {"newPassword": "mynewpass123"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + oauthToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNoContent());

        // Verify can now login with the new password
        String loginJson = """
                {"email": "oauth@test.com", "password": "mynewpass123"}
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void oauthUser_afterSettingPassword_needsCurrentToChange() throws Exception {
        // Create an OAuth user directly (null password)
        User oauthUser = User.builder()
                .name("OAuthUser2")
                .email("oauth2@test.com")
                .password(null)
                .provider(AuthProvider.GOOGLE)
                .providerId("google-456")
                .build();
        userRepository.save(oauthUser);

        String oauthToken = jwtService.generateToken("oauth2@test.com");

        // First: set password without currentPassword
        String setJson = """
                {"newPassword": "firstpass123"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + oauthToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(setJson))
                .andExpect(status().isNoContent());

        // Now: trying to change without currentPassword should fail
        String changeJson = """
                {"newPassword": "secondpass456"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + oauthToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeJson))
                .andExpect(status().isBadRequest());

        // Providing the correct currentPassword should succeed
        String correctJson = """
                {"currentPassword": "firstpass123", "newPassword": "secondpass456"}
                """;

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + oauthToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(correctJson))
                .andExpect(status().isNoContent());
    }
}
