package com.jobflow.security;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.service.OneTimeCodeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Duration LOGIN_CODE_TTL = Duration.ofSeconds(60);
    // Shown by the login page; OAuth2LoginFailureHandler sends the other codes
    static final String EMAIL_IN_USE = "email_in_use";

    private final UserRepository userRepository;
    private final OneTimeCodeService oneTimeCodeService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = extractRegistrationId(request);
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        String providerId = extractProviderId(oAuth2User, provider);
        String verifiedEmail = extractVerifiedEmail(oAuth2User, provider);
        // Without a verified email we still need a unique address, but it never matches anyone else
        String email = verifiedEmail != null ? verifiedEmail : placeholderEmail(oAuth2User, provider);
        String name = extractName(oAuth2User, provider);
        String avatarUrl = extractAvatar(oAuth2User, provider);

        User user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
        if (user == null) {
            Optional<User> sameEmail = userRepository.findByEmail(email);
            if (sameEmail.isEmpty()) {
                user = userRepository.save(User.builder()
                    .email(email)
                    .name(name)
                    .avatarUrl(avatarUrl)
                    .provider(provider)
                    .providerId(providerId)
                    .build());
            } else if (canSignInByEmail(sameEmail.get(), provider, verifiedEmail)) {
                user = sameEmail.get();
            } else {
                // Someone else holds this email; see canSignInByEmail for why we don't merge
                getRedirectStrategy().sendRedirect(request, response,
                    frontendUrl + "/login?oauthError=" + EMAIL_IN_USE);
                return;
            }
        }

        // Update avatar if it changed
        if (avatarUrl != null && !avatarUrl.equals(user.getAvatarUrl())) {
            user.setAvatarUrl(avatarUrl);
        }

        // Sign-in tokens have no Gmail access, so Gmail tokens are left alone here.
        // Users link Gmail from Settings (GmailController), which stores its own.
        userRepository.save(user);

        // Not the JWT itself: URLs end up in browser history, logs and Referer headers.
        // The frontend swaps this short-lived code for the JWT right away.
        String code = oneTimeCodeService.issue(user, OneTimeCodePurpose.OAUTH_LOGIN, LOGIN_CODE_TTL);
        String redirectUrl = frontendUrl + "/oauth/callback?code=" + code;
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String extractRegistrationId(HttpServletRequest request) {
        // URI pattern: /login/oauth2/code/{registrationId}
        String uri = request.getRequestURI();
        return uri.substring(uri.lastIndexOf('/') + 1);
    }

    /**
     * Whether a sign-in that didn't match by provider account may land in the account that
     * already has this email. Only when both sides proved they own it:
     * - password accounts never qualify, because signing up doesn't verify the email. Anyone
     *   could register a victim's address first and wait for them to sign in with Google.
     * - another account at the same provider means a different person (e.g. a reused address).
     */
    private boolean canSignInByEmail(User existing, AuthProvider provider, String verifiedEmail) {
        return verifiedEmail != null
            && existing.getProvider() != AuthProvider.LOCAL
            && existing.getProvider() != provider;
    }

    // Null unless the provider vouches for the address
    private String extractVerifiedEmail(OAuth2User user, AuthProvider provider) {
        String email = user.getAttribute("email");
        if (email == null || email.isBlank()) {
            return null;
        }
        return switch (provider) {
            // GitHub only lets users make a verified address public
            case GITHUB -> email;
            default -> isTrue(user.getAttribute("email_verified")) ? email : null;
        };
    }

    private static boolean isTrue(Object value) {
        return Boolean.TRUE.equals(value) || "true".equals(value);
    }

    // GitHub's own no-reply format, so it can't be anybody's real inbox
    private String placeholderEmail(OAuth2User user, AuthProvider provider) {
        String providerId = extractProviderId(user, provider);
        return switch (provider) {
            case GITHUB -> providerId + "+" + user.getAttribute("login") + "@users.noreply.github.com";
            default -> providerId + "@" + provider.name().toLowerCase() + ".invalid";
        };
    }

    private String extractName(OAuth2User user, AuthProvider provider) {
        return switch (provider) {
            case GITHUB -> {
                String name = user.getAttribute("name");
                yield name != null ? name : user.getAttribute("login");
            }
            default -> user.getAttribute("name");
        };
    }

    private String extractAvatar(OAuth2User user, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> user.getAttribute("picture");
            case GITHUB -> user.getAttribute("avatar_url");
            case LINKEDIN -> user.getAttribute("picture");
            default -> null;
        };
    }

    private String extractProviderId(OAuth2User user, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> user.getAttribute("sub");
            case GITHUB -> String.valueOf(user.<Integer>getAttribute("id"));
            case LINKEDIN -> user.getAttribute("sub");
            default -> null;
        };
    }
}
