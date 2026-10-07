package com.jobflow.service;

import com.jobflow.dto.AuthResponse;
import com.jobflow.dto.ChangePasswordRequest;
import com.jobflow.dto.LoginRequest;
import com.jobflow.dto.RegisterRequest;
import com.jobflow.dto.UpdateProfileRequest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.jobflow.exception.ApiException;
import com.jobflow.exception.NotFoundException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw ApiException.badRequest("EMAIL_TAKEN", "Email is already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .provider(AuthProvider.LOCAL)
                .build();

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return buildAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> ApiException.badRequest("INVALID_CREDENTIALS", "Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw ApiException.badRequest("INVALID_CREDENTIALS", "Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());
        return buildAuthResponse(user, token);
    }

    public AuthResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> NotFoundException.user());
        return buildAuthResponse(user, null);
    }

    public AuthResponse updateProfile(String currentEmail, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> NotFoundException.user());

        user.setName(request.getName());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
        if (request.getBio() != null) user.setBio(request.getBio());

        userRepository.save(user);
        return buildAuthResponse(user, null);
    }

    public AuthResponse updateTimeZone(String email, String timeZone) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> NotFoundException.user());
        user.setTimeZone(UserClock.requireValidZone(timeZone));
        userRepository.save(user);
        return buildAuthResponse(user, null);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> NotFoundException.user());

        // OAuth users setting password for the first time: skip current password check
        if (user.getPassword() != null) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                throw ApiException.badRequest("CURRENT_PASSWORD_REQUIRED", "Current password is required");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw ApiException.badRequest("CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
            }
            if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
                throw ApiException.badRequest("PASSWORD_UNCHANGED", "New password cannot be the same as your current password");
            }
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .jobTitle(user.getJobTitle())
                .bio(user.getBio())
                .hasPassword(user.getPassword() != null)
                .gmailConnected(user.isGmailConnected())
                .timeZone(user.getTimeZone())
                .build();
    }
}
