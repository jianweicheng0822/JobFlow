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

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
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

    // --- Google ---

    @Test
    void googleLogin_newUser_createsUserAndRedirects() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");
        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                googleUser("google-123", "alice@gmail.com", true, "https://photo.url"), Collections.emptyList(), "google");

        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.empty());
        stubSaveWithId(1L);
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("one-time-code-123");

        handler.onAuthenticationSuccess(request, response, authToken);

        User savedUser = firstSavedUser();
        assertThat(savedUser.getEmail()).isEqualTo("alice@gmail.com");
        assertThat(savedUser.getName()).isEqualTo("Alice");
        assertThat(savedUser.getProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(savedUser.getProviderId()).isEqualTo("google-123");
        // Gmail import needs its own consent from Settings
        assertThat(savedUser.isGmailConnected()).isFalse();
        assertThat(savedUser.getGoogleAccessToken()).isNull();

        // Back to the configured frontend, not a hard-coded dev URL
        assertThat(response.getRedirectedUrl())
                .isEqualTo("https://jobflow.example/oauth/callback?code=one-time-code-123");
        // The 60s code is tied to the new user
        verify(oneTimeCodeService).issue(savedUser, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));
    }

    @Test
    void googleLogin_returningUser_foundByAccountId_updatesAvatarAndKeepsGmailLink() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");
        // Linked Gmail earlier from Settings
        User existingUser = User.builder()
                .id(1L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GOOGLE).providerId("google-123")
                .avatarUrl("https://old-photo.url")
                .googleAccessToken("gmail-access-token")
                .googleRefreshToken("gmail-refresh-token")
                .gmailConnected(true)
                .build();

        when(userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "google-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-123", "alice@gmail.com", true, "https://new-photo.url")));

        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://new-photo.url");
        // Signing in must not overwrite the Gmail tokens with ones that can't read mail
        assertThat(existingUser.getGoogleAccessToken()).isEqualTo("gmail-access-token");
        assertThat(existingUser.getGoogleRefreshToken()).isEqualTo("gmail-refresh-token");
        assertThat(existingUser.isGmailConnected()).isTrue();
        assertThat(response.getRedirectedUrl()).contains("code=login-code");
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void googleLogin_emailOfPasswordAccount_isRefused() throws Exception {
        // Someone signed up with this address (unverified) before its owner used Google
        request.setRequestURI("/login/oauth2/code/google");
        User passwordAccount = User.builder()
                .id(5L).email("alice@gmail.com").name("Squatter")
                .password("hash").provider(AuthProvider.LOCAL).build();
        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(passwordAccount));

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-123", "alice@gmail.com", true, null)));

        assertThat(response.getRedirectedUrl()).isEqualTo("https://jobflow.example/login?oauthError=email_in_use");
        verify(oneTimeCodeService, never()).issue(any(), any(), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void googleLogin_verifiedEmailOfGithubAccount_signsIntoThatAccount() throws Exception {
        // Both GitHub and Google vouch for the address, so it's the same person
        request.setRequestURI("/login/oauth2/code/google");
        User githubAccount = User.builder()
                .id(7L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GITHUB).providerId("12345").build();
        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(githubAccount));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-123", "alice@gmail.com", true, null)));

        verify(oneTimeCodeService).issue(githubAccount, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));
        // Still a GitHub account; the Google login is matched by email each time
        assertThat(githubAccount.getProvider()).isEqualTo(AuthProvider.GITHUB);
    }

    @Test
    void googleLogin_unverifiedEmail_neverMatchesAnExistingAccount() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");
        when(userRepository.findByEmail("google-999@google.invalid")).thenReturn(Optional.empty());
        stubSaveWithId(8L);
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-999", "alice@gmail.com", false, null)));

        assertThat(firstSavedUser().getEmail()).isEqualTo("google-999@google.invalid");
        verify(userRepository, never()).findByEmail("alice@gmail.com");
    }

    @Test
    void googleLogin_sameEmailAtDifferentGoogleAccount_isRefused() throws Exception {
        // A recycled address: a new Google account must not inherit the old one's data
        request.setRequestURI("/login/oauth2/code/google");
        User oldAccount = User.builder()
                .id(9L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GOOGLE).providerId("google-old").build();
        when(userRepository.findByEmail("alice@gmail.com")).thenReturn(Optional.of(oldAccount));

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-new", "alice@gmail.com", true, null)));

        assertThat(response.getRedirectedUrl()).endsWith("/login?oauthError=email_in_use");
    }

    @Test
    void existingUser_sameAvatar_doesNotUpdate() throws Exception {
        request.setRequestURI("/login/oauth2/code/google");
        User existingUser = User.builder()
                .id(1L).email("alice@gmail.com").name("Alice")
                .provider(AuthProvider.GOOGLE).providerId("google-123")
                .avatarUrl("https://same-photo.url").build();
        when(userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "google-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response,
                authFor(googleUser("google-123", "alice@gmail.com", true, "https://same-photo.url")));

        assertThat(existingUser.getAvatarUrl()).isEqualTo("https://same-photo.url");
    }

    // --- GitHub ---

    @Test
    void githubLogin_newUser_createsUserWithGithubAttributes() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        stubSaveWithId(2L);
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("gh-code");

        handler.onAuthenticationSuccess(request, response, authFor(new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 12345, "login", "alice-dev", "name", "Alice Dev",
                        "email", "alice@example.com", "avatar_url", "https://github-avatar.url"),
                "id")));

        User savedUser = firstSavedUser();
        assertThat(savedUser.getEmail()).isEqualTo("alice@example.com");
        assertThat(savedUser.getName()).isEqualTo("Alice Dev");
        assertThat(savedUser.getProvider()).isEqualTo(AuthProvider.GITHUB);
        assertThat(savedUser.getAvatarUrl()).isEqualTo("https://github-avatar.url");
        assertThat(savedUser.getProviderId()).isEqualTo("12345");
    }

    @Test
    void githubLogin_noPublicEmail_usesNoReplyAddress() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");
        when(userRepository.findByEmail("99999+secret-user@users.noreply.github.com")).thenReturn(Optional.empty());
        stubSaveWithId(3L);
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("gh-code");

        handler.onAuthenticationSuccess(request, response, authFor(new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 99999, "login", "secret-user", "name", "Secret"),
                "id")));

        assertThat(firstSavedUser().getEmail()).isEqualTo("99999+secret-user@users.noreply.github.com");
    }

    @Test
    void githubLogin_noPublicEmail_neverMatchesAPasswordAccount() throws Exception {
        // The old fallback was login@github.com, which anyone could sign up with first
        request.setRequestURI("/login/oauth2/code/github");
        User squatter = User.builder()
                .id(6L).email("99999+secret-user@users.noreply.github.com").name("Squatter")
                .password("hash").provider(AuthProvider.LOCAL).build();
        when(userRepository.findByEmail("99999+secret-user@users.noreply.github.com")).thenReturn(Optional.of(squatter));

        handler.onAuthenticationSuccess(request, response, authFor(new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 99999, "login", "secret-user", "name", "Secret"),
                "id")));

        assertThat(response.getRedirectedUrl()).endsWith("/login?oauthError=email_in_use");
    }

    @Test
    void githubLogin_accountFromOldFallbackEmail_stillSignsIn() throws Exception {
        // Created back when the fallback was login@github.com; found by GitHub id now
        request.setRequestURI("/login/oauth2/code/github");
        User existing = User.builder()
                .id(4L).email("secret-user@github.com").name("Secret")
                .provider(AuthProvider.GITHUB).providerId("99999").build();
        when(userRepository.findByProviderAndProviderId(AuthProvider.GITHUB, "99999")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("gh-code");

        handler.onAuthenticationSuccess(request, response, authFor(new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 99999, "login", "secret-user", "name", "Secret"),
                "id")));

        verify(oneTimeCodeService).issue(existing, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));
        assertThat(existing.getEmail()).isEqualTo("secret-user@github.com");
    }

    @Test
    void githubLogin_noName_fallsBackToLogin() throws Exception {
        request.setRequestURI("/login/oauth2/code/github");
        when(userRepository.findByEmail("noname@example.com")).thenReturn(Optional.empty());
        stubSaveWithId(4L);
        when(oneTimeCodeService.issue(any(), eq(OneTimeCodePurpose.OAUTH_LOGIN), any())).thenReturn("login-code");

        handler.onAuthenticationSuccess(request, response, authFor(new DefaultOAuth2User(
                Collections.emptyList(),
                Map.of("id", 11111, "login", "noname-user", "email", "noname@example.com"),
                "id")));

        assertThat(firstSavedUser().getName()).isEqualTo("noname-user");
    }

    // --- helpers ---

    private static OAuth2User googleUser(String sub, String email, boolean verified, String picture) {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("sub", sub);
        attrs.put("email", email);
        attrs.put("email_verified", verified);
        attrs.put("name", "Alice");
        if (picture != null) attrs.put("picture", picture);
        return new DefaultOAuth2User(Collections.emptyList(), attrs, "sub");
    }

    // The handler only reads the principal, so a plain Authentication is enough
    private static Authentication authFor(OAuth2User user) {
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(user);
        return auth;
    }

    private void stubSaveWithId(long id) {
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(id);
            return u;
        });
    }

    private User firstSavedUser() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(captor.capture());
        return captor.getAllValues().get(0);
    }
}
