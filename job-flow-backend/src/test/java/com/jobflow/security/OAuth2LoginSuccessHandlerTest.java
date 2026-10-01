package com.jobflow.security;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private OAuth2AuthorizedClientService authorizedClientService;

    @InjectMocks
    private OAuth2LoginSuccessHandler handler;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    // --- Google OAuth2 ---

    @Test
    void googleLogin_newUser_createsUserAndRedirects() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("sub", "google-123", "email", "alice@gmail.com", "name", "Alice", "picture", "https://photo.url"),
                "sub"
        );

        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                oAuth2User, Collections.emptyList(), "google");

        // No existing user
        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        // Mock authorized client with tokens
        OAuth2AuthorizedClient client = mock(OAuth2AuthorizedClient.class);
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, "google-access-token", Instant.now(), Instant.now().plusSeconds(3600));
        OAuth2RefreshToken refreshToken = new OAuth2RefreshToken("google-refresh-token", Instant.now());
        when(client.getAccessToken()).thenReturn(accessToken);
        when(client.getRefreshToken()).thenReturn(refreshToken);
        when(authorizedClientService.loadAuthorizedClient("google", "google-123")).thenReturn(client);

        when(jwtService.generateToken("alice@gmail.com")).thenReturn("jwt-token-123");

        handler.onAuthenticationSuccess(request, response, authToken);

        // Verify user was created
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        User savedUser = userCaptor.getAllValues().get(0);
        assertThat(savedUser.getEmail()).isEqualTo("alice@gmail.com");
        assertThat(savedUser.getName()).isEqualTo("Alice");
        assertThat(savedUser.getProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(savedUser.getProviderId()).isEqualTo("google-123");

        // Verify redirect
        assertThat(response.getRedirectedUrl()).contains("token=jwt-token-123");
    }

    @Test
    void googleLogin_existingUser_updatesAvatarAndTokens() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        User existingUser = User.builder()
                .id(1L)
                .email("alice@gmail.com")
                .name("Alice")
                .provider(AuthProvider.GOOGLE)
                .providerId("google-123")
                .avatarUrl("https://old-photo.url")
                .build();

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("sub", "google-123", "email", "alice@gmail.com", "name", "Alice", "picture", "https://new-photo.url"),
                "sub"
        );

        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                oAuth2User, Collections.emptyList(), "google");

        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        OAuth2AuthorizedClient client = mock(OAuth2AuthorizedClient.class);
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, "new-access-token", Instant.now(), Instant.now().plusSeconds(3600));
        when(client.getAccessToken()).thenReturn(accessToken);
        when(client.getRefreshToken()).thenReturn(null);
        when(authorizedClientService.loadAuthorizedClient("google", "google-123")).thenReturn(client);

        when(jwtService.generateToken("alice@gmail.com")).thenReturn("jwt-token");

        handler.onAuthenticationSuccess(request, response, authToken);

        // Avatar should be updated
        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://new-photo.url");
        // Google access token stored
        assertThat(existingUser.getGoogleAccessToken()).isEqualTo("new-access-token");
        assertThat(existingUser.isGmailConnected()).isTrue();
    }

    @Test
    void googleLogin_noAuthorizedClient_stillRedirects() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        User existingUser = User.builder()
                .id(1L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GOOGLE).providerId("google-123").build();

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("sub", "google-123", "email", "alice@gmail.com", "name", "Alice", "picture", "https://photo.url"),
                "sub"
        );

        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                oAuth2User, Collections.emptyList(), "google");

        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authorizedClientService.loadAuthorizedClient("google", "google-123")).thenReturn(null);
        when(jwtService.generateToken("alice@gmail.com")).thenReturn("jwt-token");

        handler.onAuthenticationSuccess(request, response, authToken);

        // Should still redirect successfully
        assertThat(response.getRedirectedUrl()).contains("token=jwt-token");
    }

    // --- GitHub OAuth2 ---

    @Test
    void githubLogin_newUser_createsUserWithGithubAttributes() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 12345, "login", "alice-dev", "name", "Alice Dev",
                        "email", "alice@github.com", "avatar_url", "https://github-avatar.url"),
                "id"
        );

        // Use a plain Authentication (not OAuth2AuthenticationToken) to skip Google token storage
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(userRepository.findByEmail("alice@github.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(jwtService.generateToken("alice@github.com")).thenReturn("gh-jwt-token");

        handler.onAuthenticationSuccess(request, response, auth);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        User savedUser = userCaptor.getAllValues().get(0);
        assertThat(savedUser.getEmail()).isEqualTo("alice@github.com");
        assertThat(savedUser.getName()).isEqualTo("Alice Dev");
        assertThat(savedUser.getProvider()).isEqualTo(AuthProvider.GITHUB);
        assertThat(savedUser.getAvatarUrl()).isEqualTo("https://github-avatar.url");
        assertThat(savedUser.getProviderId()).isEqualTo("12345");
    }

    @Test
    void githubLogin_noPublicEmail_fallsBackToLogin() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");

        // GitHub user without public email
        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 99999, "login", "secret-user", "name", "Secret"),
                "id"
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(userRepository.findByEmail("secret-user@github.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(3L);
            return u;
        });
        when(jwtService.generateToken("secret-user@github.com")).thenReturn("gh-jwt-token");

        handler.onAuthenticationSuccess(request, response, auth);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        assertThat(userCaptor.getAllValues().get(0).getEmail()).isEqualTo("secret-user@github.com");
    }

    @Test
    void githubLogin_noName_fallsBackToLogin() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 11111, "login", "noname-user", "email", "noname@github.com"),
                "id"
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(userRepository.findByEmail("noname@github.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(4L);
            return u;
        });
        when(jwtService.generateToken("noname@github.com")).thenReturn("jwt");

        handler.onAuthenticationSuccess(request, response, auth);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        // name should fall back to login
        assertThat(userCaptor.getAllValues().get(0).getName()).isEqualTo("noname-user");
    }

    // --- Avatar update ---

    @Test
    void existingUser_sameAvatar_doesNotUpdate() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        User existingUser = User.builder()
                .id(1L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GOOGLE).providerId("google-123")
                .avatarUrl("https://same-photo.url").build();

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("sub", "google-123", "email", "alice@gmail.com", "name", "Alice", "picture", "https://same-photo.url"),
                "sub"
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken("alice@gmail.com")).thenReturn("jwt");

        handler.onAuthenticationSuccess(request, response, auth);

        // Avatar should remain the same
        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://same-photo.url");
    }
}
