package com.jobflow.service;

import com.jobflow.controller.BaseIntegrationTest;
import com.jobflow.model.AuthProvider;
import com.jobflow.model.OneTimeCode;
import com.jobflow.model.OneTimeCodePurpose;
import com.jobflow.model.User;
import com.jobflow.repository.OneTimeCodeRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import static org.assertj.core.api.Assertions.assertThat;

class OneTimeCodeServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private OneTimeCodeService service;

    @Autowired
    private OneTimeCodeRepository repository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    @SuppressWarnings("unused")
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = userRepository.save(User.builder()
                .email("alice@test.com")
                .name("Alice")
                .provider(AuthProvider.GOOGLE)
                .build());
    }

    @Test
    void issuedCode_consumesOnceForItsUser() {
        String code = service.issue(alice, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));

        Optional<User> first = service.consume(code, OneTimeCodePurpose.OAUTH_LOGIN);
        Optional<User> second = service.consume(code, OneTimeCodePurpose.OAUTH_LOGIN);

        assertThat(first).map(User::getEmail).contains("alice@test.com");
        assertThat(second).isEmpty();
        assertThat(repository.count()).isZero();
    }

    @Test
    void storesOnlyTheHash() {
        String code = service.issue(alice, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));

        OneTimeCode row = repository.findAll().get(0);
        assertThat(row.getCodeHash()).hasSize(64).isNotEqualTo(code);
        // 32 random bytes, base64url without padding
        assertThat(code).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void expiredCode_isRejectedAndRemoved() {
        String code = service.issue(alice, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(-1));

        assertThat(service.consume(code, OneTimeCodePurpose.OAUTH_LOGIN)).isEmpty();
        assertThat(repository.count()).isZero();
    }

    @Test
    void codeForOtherPurpose_isRejectedAndStaysUsable() {
        String code = service.issue(alice, OneTimeCodePurpose.GMAIL_LINK, Duration.ofMinutes(10));

        assertThat(service.consume(code, OneTimeCodePurpose.OAUTH_LOGIN)).isEmpty();
        assertThat(service.consume(code, OneTimeCodePurpose.GMAIL_LINK)).isPresent();
    }

    @Test
    void unknownOrMissingCode_isRejected() {
        assertThat(service.consume("not-a-real-code", OneTimeCodePurpose.OAUTH_LOGIN)).isEmpty();
        assertThat(service.consume("", OneTimeCodePurpose.OAUTH_LOGIN)).isEmpty();
        assertThat(service.consume(null, OneTimeCodePurpose.OAUTH_LOGIN)).isEmpty();
    }

    // Two tabs (or an attacker replaying a leaked URL) hitting the same code at once
    @Test
    void concurrentConsume_onlyOneWins() throws Exception {
        String code = service.issue(alice, OneTimeCodePurpose.OAUTH_LOGIN, Duration.ofSeconds(60));
        CountDownLatch start = new CountDownLatch(1);

        List<CompletableFuture<Optional<User>>> attempts = List.of(1, 2, 3, 4).stream()
                .map(i -> CompletableFuture.supplyAsync(() -> {
                    try {
                        start.await();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return service.consume(code, OneTimeCodePurpose.OAUTH_LOGIN);
                }))
                .toList();
        start.countDown();

        long winners = attempts.stream().map(CompletableFuture::join).filter(Optional::isPresent).count();
        assertThat(winners).isEqualTo(1);
    }

    @Test
    void purgeExpired_removesOnlyExpiredCodes() {
        String live = service.issue(alice, OneTimeCodePurpose.GMAIL_LINK, Duration.ofMinutes(10));
        repository.save(OneTimeCode.builder()
                .codeHash("a".repeat(64))
                .purpose(OneTimeCodePurpose.OAUTH_LOGIN)
                .user(alice)
                .expiresAt(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(5))
                .build());

        service.purgeExpired();

        assertThat(repository.count()).isEqualTo(1);
        assertThat(service.consume(live, OneTimeCodePurpose.GMAIL_LINK)).isPresent();
    }
}
