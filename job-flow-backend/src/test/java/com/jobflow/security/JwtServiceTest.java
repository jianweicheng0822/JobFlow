package com.jobflow.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "testSecretKeyThatIsAtLeast256BitsLongForHS256AlgorithmInTests";
    private static final long EXPIRATION_MS = 3600000; // 1 hour

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void generateToken_returnsNonNullToken() {
        String token = jwtService.generateToken("alice@test.com");
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void getEmailFromToken_returnsCorrectEmail() {
        String email = "alice@test.com";
        String token = jwtService.generateToken(email);

        assertThat(jwtService.getEmailFromToken(token)).isEqualTo(email);
    }

    @Test
    void validateToken_returnsTrueForValidToken() {
        String token = jwtService.generateToken("alice@test.com");
        assertThat(jwtService.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_returnsFalseForTamperedToken() {
        String token = jwtService.generateToken("alice@test.com");
        // Flip a character in the signature portion
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtService.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_returnsFalseForDifferentKey() {
        String differentSecret = "anotherSecretKeyThatIsAlsoAtLeast256BitsLongForHS256Algorithm!";
        JwtService otherService = new JwtService(differentSecret, EXPIRATION_MS);

        String token = otherService.generateToken("alice@test.com");
        assertThat(jwtService.validateToken(token)).isFalse();
    }

    @Test
    void validateToken_returnsFalseForExpiredToken() {
        // Build a token that's already expired using jjwt directly
        var key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        String expiredToken = Jwts.builder()
                .subject("alice@test.com")
                .issuedAt(new Date(now.getTime() - 7200000))
                .expiration(new Date(now.getTime() - 3600000)) // expired 1 hour ago
                .signWith(key)
                .compact();

        assertThat(jwtService.validateToken(expiredToken)).isFalse();
    }
}
