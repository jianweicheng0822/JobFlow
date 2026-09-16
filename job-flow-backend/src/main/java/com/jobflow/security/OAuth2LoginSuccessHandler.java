package com.jobflow.security;

import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final OAuth2AuthorizedClientService authorizedClientService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = extractRegistrationId(request);
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        String email = extractEmail(oAuth2User, provider);
        String name = extractName(oAuth2User, provider);
        String avatarUrl = extractAvatar(oAuth2User, provider);
        String providerId = extractProviderId(oAuth2User, provider);

        // Find existing user or create a new one
        User user = userRepository.findByEmail(email).orElseGet(() ->
            userRepository.save(User.builder()
                .email(email)
                .name(name)
                .avatarUrl(avatarUrl)
                .provider(provider)
                .providerId(providerId)
                .build())
        );

        // Update avatar if it changed
        if (avatarUrl != null && !avatarUrl.equals(user.getAvatarUrl())) {
            user.setAvatarUrl(avatarUrl);
        }

        // Store Google OAuth tokens for Gmail API access
        if (provider == AuthProvider.GOOGLE && authentication instanceof OAuth2AuthenticationToken oauthToken) {
            OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                    oauthToken.getAuthorizedClientRegistrationId(),
                    oauthToken.getName());
            if (client != null) {
                String accessToken = client.getAccessToken().getTokenValue();
                user.setGoogleAccessToken(accessToken);
                if (client.getRefreshToken() != null) {
                    user.setGoogleRefreshToken(client.getRefreshToken().getTokenValue());
                }
                user.setGmailConnected(true);
            }
        }

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        String redirectUrl = "http://localhost:5173/oauth/callback?token=" + token;
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String extractRegistrationId(HttpServletRequest request) {
        // URI pattern: /login/oauth2/code/{registrationId}
        String uri = request.getRequestURI();
        return uri.substring(uri.lastIndexOf('/') + 1);
    }

    private String extractEmail(OAuth2User user, AuthProvider provider) {
        return switch (provider) {
            case GITHUB -> {
                String email = user.getAttribute("email");
                // GitHub may not expose email publicly; fall back to login-based email
                yield email != null ? email : user.getAttribute("login") + "@github.com";
            }
            default -> user.getAttribute("email");
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
