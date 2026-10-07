package com.jobflow.config;

import com.jobflow.controller.AuthController;
import com.jobflow.dto.AuthResponse;
import com.jobflow.security.JwtAuthenticationFilter;
import com.jobflow.security.JwtService;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import com.jobflow.service.AuthService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Runs the real SecurityConfig against AuthController without a database,
// so it works without Docker (unlike the *IntegrationTest classes)
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@ActiveProfiles("test")
class AuthEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/profile", "/api/auth/password", "/api/auth/time-zone"})
    void accountEndpoints_withoutToken_return401(String path) throws Exception {
        // Used to slip through a blanket permitAll and blow up with an NPE (500)
        mockMvc.perform(put(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"newPassword\":\"secret123\",\"timeZone\":\"UTC\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(authService);
    }

    @Test
    void me_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginAndRegister_stayPublic() throws Exception {
        AuthResponse ok = AuthResponse.builder().token("jwt").name("A").email("a@test.com").build();
        when(authService.login(any())).thenReturn(ok);
        when(authService.register(any())).thenReturn(ok);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@test.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A\",\"email\":\"a@test.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void timeZone_withValidToken_reachesTheController() throws Exception {
        when(jwtService.validateToken("good-token")).thenReturn(true);
        when(jwtService.getEmailFromToken("good-token")).thenReturn("a@test.com");
        when(authService.updateTimeZone(anyString(), anyString()))
                .thenReturn(AuthResponse.builder().email("a@test.com").timeZone("UTC").build());

        mockMvc.perform(put("/api/auth/time-zone")
                        .header("Authorization", "Bearer good-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZone\":\"UTC\"}"))
                .andExpect(status().isOk());
    }
}
