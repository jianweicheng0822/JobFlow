package com.jobflow.service;

import com.jobflow.dto.AuthResponse;
import com.jobflow.dto.LoginRequest;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import com.jobflow.exception.ApiException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Alice")
                .email("alice@test.com")
                .password("encodedPassword")
                .provider(AuthProvider.LOCAL)
                .build();
    }

    @Test
    void register_success() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Alice");
        request.setEmail("alice@test.com");
        request.setPassword("password123");

        when(userRepository.existsByEmail("alice@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken("alice@test.com")).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getEmail()).isEqualTo("alice@test.com");
        assertThat(response.getName()).isEqualTo("Alice");
    }

    @Test
    void register_duplicateEmail_throwsException() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Alice");
        request.setEmail("alice@test.com");
        request.setPassword("password123");

        when(userRepository.existsByEmail("alice@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    void login_success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtService.generateToken("alice@test.com")).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getEmail()).isEqualTo("alice@test.com");
    }

    @Test
    void login_wrongEmail_throwsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void login_wrongPassword_throwsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@test.com");
        request.setPassword("wrongPassword");

        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void getCurrentUser_success() {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));

        AuthResponse response = authService.getCurrentUser("alice@test.com");

        assertThat(response.getEmail()).isEqualTo("alice@test.com");
        assertThat(response.getName()).isEqualTo("Alice");
        assertThat(response.getToken()).isNull();
    }

    // --- time zone ---

    @Test
    void updateTimeZone_savesAndReturnsIt() {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.updateTimeZone("alice@test.com", " Asia/Shanghai ");

        assertThat(testUser.getTimeZone()).isEqualTo("Asia/Shanghai");
        assertThat(response.getTimeZone()).isEqualTo("Asia/Shanghai");
    }

    @Test
    void updateTimeZone_unknownZone_isRejectedAndNothingSaved() {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> authService.updateTimeZone("alice@test.com", "Not/A_Zone"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Unknown time zone: Not/A_Zone");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getCurrentUser_includesTimeZone() {
        testUser.setTimeZone("America/Denver");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));

        assertThat(authService.getCurrentUser("alice@test.com").getTimeZone()).isEqualTo("America/Denver");
    }

    // --- error codes ---

    @Test
    void login_wrongPassword_hasInvalidCredentialsCode() {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@test.com");
        request.setPassword("wrong");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_CREDENTIALS");
    }

    @Test
    void unknownTimeZone_hasCodeAndTheZoneAsParam() {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> authService.updateTimeZone("alice@test.com", "Not/A_Zone"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "UNKNOWN_TIME_ZONE")
                .hasFieldOrPropertyWithValue("params", java.util.Map.of("timeZone", "Not/A_Zone"));
    }

    @Test
    void missingUser_isNotFoundWithCode() {
        when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser("ghost@test.com"))
                .isInstanceOf(com.jobflow.exception.NotFoundException.class)
                .hasFieldOrPropertyWithValue("code", "USER_NOT_FOUND");
    }
}
