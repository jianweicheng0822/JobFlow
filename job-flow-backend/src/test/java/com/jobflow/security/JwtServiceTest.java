package com.jobflow.security;

import com.jobflow.model.User;
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
    private final User alice = User.builder().id(42L).email("alice@test.com").tokenVersion(3).build();

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void token_carriesUserIdAndVersion() {
        String token = jwtService.generateToken(alice);

        assertThat(jwtService.parse(token)).contains(new JwtService.TokenClaims(42L, 3));
    }

    @Test
    void token_doesNotContainTheEmail() {
        String payload = new String(java.util.Base64.getUrlDecoder()
                .decode(jwtService.generateToken(alice).split("\\.")[1]), StandardCharsets.UTF_8);

        assertThat(payload).doesNotContain("alice@test.com").contains("\"sub\":\"42\"");
    }

    @Test
    void tamperedToken_isRejected() {
        String token = jwtService.generateToken(alice);
        // Flip a character in the signature portion
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtService.parse(tampered)).isEmpty();
    }

    @Test
    void tokenSignedWithAnotherKey_isRejected() {
        JwtService otherService = new JwtService("anotherSecretKeyThatIsAlsoAtLeast256BitsLongForHS256Algorithm!", EXPIRATION_MS);

        assertThat(jwtService.parse(otherService.generateToken(alice))).isEmpty();
    }

    @Test
    void expiredToken_isRejected() {
        Date now = new Date();
        String expiredToken = signed(Jwts.builder()
                .subject("42")
                .claim("ver", 3)
                .issuedAt(new Date(now.getTime() - 7200000))
                .expiration(new Date(now.getTime() - 3600000))); // expired 1 hour ago

        assertThat(jwtService.parse(expiredToken)).isEmpty();
    }

    @Test
    void oldEmailSubjectToken_isRejected() {
        // What tokens looked like before they carried an id and version
        Date now = new Date();
        String oldToken = signed(Jwts.builder()
                .subject("alice@test.com")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRATION_MS)));

        assertThat(jwtService.parse(oldToken)).isEmpty();
    }

    @Test
    void garbage_isRejected() {
        assertThat(jwtService.parse("")).isEmpty();
        assertThat(jwtService.parse("not-a-jwt")).isEmpty();
    }

    private static String signed(io.jsonwebtoken.JwtBuilder builder) {
        return builder.signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
