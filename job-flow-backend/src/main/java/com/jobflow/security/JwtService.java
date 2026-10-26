package com.jobflow.security;

import com.jobflow.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private static final String VERSION_CLAIM = "ver";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /** Who a valid token belongs to, and which of their token versions it was issued under. */
    public record TokenClaims(long userId, int version) {
    }

    // The user id, not the email: a deleted account's email can be signed up again,
    // and the new account mustn't accept the old one's tokens
    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim(VERSION_CLAIM, user.getTokenVersion())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    // Empty for anything we wouldn't accept: bad signature, expired, or the old
    // email-subject format from before tokens carried an id and version
    public Optional<TokenClaims> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Integer version = claims.get(VERSION_CLAIM, Integer.class);
            if (version == null) {
                return Optional.empty();
            }
            return Optional.of(new TokenClaims(Long.parseLong(claims.getSubject()), version));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
