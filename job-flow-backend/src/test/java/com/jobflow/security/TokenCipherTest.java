package com.jobflow.security;

import com.jobflow.config.OAuthProviders;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TokenCipherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String OTHER_KEY = Base64.getEncoder().encodeToString("another-32-byte-key-for-tests!!!".getBytes());

    private static OAuthProviders gmail(boolean on) {
        OAuthProviders providers = mock(OAuthProviders.class);
        when(providers.isGmailEnabled()).thenReturn(on);
        return providers;
    }

    @Test
    void encryptsAndDecryptsBack() {
        TokenCipher cipher = new TokenCipher(KEY, gmail(true));

        String stored = cipher.encrypt("ya29.secret-token");

        assertThat(stored).startsWith("v1:").doesNotContain("secret-token");
        assertThat(cipher.decrypt(stored)).isEqualTo("ya29.secret-token");
    }

    @Test
    void usesAFreshIvEachTime() {
        TokenCipher cipher = new TokenCipher(KEY, gmail(true));

        assertThat(cipher.encrypt("same")).isNotEqualTo(cipher.encrypt("same"));
    }

    @Test
    void passesNullsThrough() {
        TokenCipher cipher = new TokenCipher(KEY, gmail(true));

        assertThat(cipher.encrypt(null)).isNull();
        assertThat(cipher.decrypt(null)).isNull();
    }

    @Test
    void readsTokensSavedBeforeEncryptionAsIs() {
        TokenCipher cipher = new TokenCipher(KEY, gmail(true));

        assertThat(cipher.decrypt("1//old-plain-refresh-token")).isEqualTo("1//old-plain-refresh-token");
    }

    @Test
    void refusesToDecryptWithTheWrongKey() {
        String stored = new TokenCipher(KEY, gmail(true)).encrypt("token");
        TokenCipher other = new TokenCipher(OTHER_KEY, gmail(true));

        assertThatThrownBy(() -> other.decrypt(stored)).hasMessageContaining("wrong TOKEN_ENCRYPTION_KEY");
    }

    @Test
    void noticesATamperedValue() {
        TokenCipher cipher = new TokenCipher(KEY, gmail(true));
        byte[] raw = Base64.getDecoder().decode(cipher.encrypt("token").substring(3));
        raw[raw.length - 1] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt("v1:" + Base64.getEncoder().encodeToString(raw)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void failsStartupWithoutAKeyWhenGmailIsOn() {
        assertThatThrownBy(() -> new TokenCipher("  ", gmail(true)))
                .hasMessageContaining("TOKEN_ENCRYPTION_KEY must be set");
    }

    @Test
    void isOffWithoutAKeyWhenGmailIsOff() {
        TokenCipher cipher = new TokenCipher("", gmail(false));

        assertThat(cipher.isEnabled()).isFalse();
        assertThatThrownBy(() -> cipher.encrypt("token")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsKeysThatArentThirtyTwoBytes() {
        String short16 = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> new TokenCipher(short16, gmail(true))).hasMessageContaining("32 bytes, got 16");
        assertThatThrownBy(() -> new TokenCipher("not base64!", gmail(true))).hasMessageContaining("base64");
    }
}
