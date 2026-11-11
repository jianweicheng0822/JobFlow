package com.jobflow.security;

import com.jobflow.config.OAuthProviders;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encrypts the Google tokens we keep for Gmail import (AES-256-GCM), so a leaked
 * database dump or backup doesn't hand out live access to someone's mailbox.
 *
 * Stored values look like "v1:" + base64(12-byte IV + ciphertext + tag). Anything without
 * the prefix is a token saved before encryption existed and is read as is; the startup
 * migration rewrites those.
 *
 * The key comes from TOKEN_ENCRYPTION_KEY (32 random bytes, base64). It's required when
 * Gmail is configured, since that's the only time tokens get stored.
 */
@Component
@Slf4j
public class TokenCipher {

    static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey key;
    private final SecureRandom random = new SecureRandom();

    public TokenCipher(@Value("${app.token-encryption-key:}") String base64Key, OAuthProviders providers) {
        String trimmed = base64Key.trim();
        if (trimmed.isEmpty()) {
            if (providers.isGmailEnabled()) {
                throw new IllegalStateException("TOKEN_ENCRYPTION_KEY must be set when Google sign-in is on, "
                        + "because linking Gmail stores Google tokens. Generate one with: openssl rand -base64 32");
            }
            this.key = null;
            return;
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(trimmed);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("TOKEN_ENCRYPTION_KEY isn't valid base64. Generate one with: openssl rand -base64 32");
        }
        if (raw.length != 32) {
            throw new IllegalStateException("TOKEN_ENCRYPTION_KEY must decode to 32 bytes, got " + raw.length
                    + ". Generate one with: openssl rand -base64 32");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public boolean isEnabled() {
        return key != null;
    }

    public static boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    public String encrypt(String plain) {
        if (plain == null) return null;
        if (key == null) {
            // Only reachable if Gmail is off, and then nothing should be saving tokens
            throw new IllegalStateException("Can't store a Google token: TOKEN_ENCRYPTION_KEY isn't set");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + sealed.length).put(iv).put(sealed).array();
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Couldn't encrypt token", e);
        }
    }

    public String decrypt(String stored) {
        if (stored == null) return null;
        if (!isEncrypted(stored)) {
            return stored; // saved before encryption; the startup migration will rewrite it
        }
        if (key == null) {
            throw new IllegalStateException("Found an encrypted Google token but TOKEN_ENCRYPTION_KEY isn't set");
        }
        try {
            byte[] in = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, in, 0, IV_BYTES));
            byte[] plain = cipher.doFinal(in, IV_BYTES, in.length - IV_BYTES);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            // Wrong key or a tampered value; GCM's tag check catches both
            throw new IllegalStateException("Couldn't decrypt a stored Google token (wrong TOKEN_ENCRYPTION_KEY?)", e);
        }
    }
}
