package com.jobflow.security;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.OneTimeCodeService;
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
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

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
    private OneTimeCodeService oneTimeCodeService;

    @InjectMocks
    private OAuth2LoginSuccessHandler handler;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        // Normally injected from app.frontend-url
        ReflectionTestUtils.setField(handler, "frontendUrl", "https://jobflow.example");
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

        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("one-time-code-123");

        handler.onAuthenticationSuccess(request, response, authToken);

        // Verify user was created
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        User savedUser = userCaptor.getAllValues().get(0);
        assertThat(savedUser.getEmail()).isEqualTo("alice@gmail.com");
        assertThat(savedUser.getName()).isEqualTo("Alice");
        assertThat(savedUser.getProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(savedUser.getProviderId()).isEqualTo("google-123");

        // Back to the configured frontend, not a hard-coded dev URL
        assertThat(response.getRedirectedUrl())
                .isEqualTo("https://jobflow.example/oauth/callback?code=one-time-code-123");
        // The 60s code is tied to the new user
        verify(oneTimeCodeService).issue(savedUser, OneTimeCodePurpose.OAUTH_LOGIN, java.time.Duration.ofSeconds(60));
    }

    @Test
    void googleLogin_existingUser_updatesAvatarAndKeepsGmailLink() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        // Linked Gmail earlier from Settings
        User existingUser = User.builder()
                .id(1L)
                .email("alice@gmail.com")
                .name("Alice")
                .provider(AuthProvider.GOOGLE)
                .providerId("google-123")
                .avatarUrl("https://old-photo.url")
                .googleAccessToken("gmail-access-token")
                .googleRefreshToken("gmail-refresh-token")
                .gmailConnected(true)
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
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response, authToken);

        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://new-photo.url");
        // Signing in must not overwrite the Gmail tokens with ones that can't read mail
        assertThat(existingUser.getGoogleAccessToken()).isEqualTo("gmail-access-token");
        assertThat(existingUser.getGoogleRefreshToken()).isEqualTo("gmail-refresh-token");
        assertThat(existingUser.isGmailConnected()).isTrue();
        assertThat(response.getRedirectedUrl()).contains("code=login-code");
    }

    @Test
    void googleLogin_newUser_isNotGmailConnected() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");

        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("sub", "google-456", "email", "bob@gmail.com", "name", "Bob", "picture", "https://photo.url"),
                "sub"
        );

        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                oAuth2User, Collections.emptyList(), "google");

        when(userRepository.findByEmail("bob@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response, authToken);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        // Gmail import needs its own consent from Settings
        assertThat(savedUser.isGmailConnected()).isFalse();
        assertThat(savedUser.getGoogleAccessToken()).isNull();
        assertThat(savedUser.getGoogleRefreshToken()).isNull();
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

        // The handler only reads the principal, so a plain Authentication is enough
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(userRepository.findByEmail("alice@github.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("gh-code");

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
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("gh-code");

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
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

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
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response, auth);

        // Avatar should remain the same
        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://same-photo.url");
    }
}
