package com.jobflow.security;

import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TokenVersionsTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TokenVersions tokenVersions;

    @Test
    void readsTheDatabaseOnceThenServesFromMemory() {
        when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(0));

        assertThat(tokenVersions.isCurrent(1L, 0)).isTrue();
        assertThat(tokenVersions.isCurrent(1L, 0)).isTrue();
        assertThat(tokenVersions.isCurrent(1L, 5)).isFalse();

        verify(userRepository, times(1)).findTokenVersionById(1L);
    }

    @Test
    void unknownUser_isNeverCurrent() {
        when(userRepository.findTokenVersionById(9L)).thenReturn(Optional.empty());

        assertThat(tokenVersions.isCurrent(9L, 0)).isFalse();
    }

    @Test
    void revokeAll_savesTheNewVersionAndRejectsOlderTokens() {
        User user = User.builder().id(1L).tokenVersion(0).build();
        when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(0));
        assertThat(tokenVersions.isCurrent(1L, 0)).isTrue();

        tokenVersions.revokeAll(user);

        verify(userRepository).save(user);
        assertThat(user.getTokenVersion()).isEqualTo(1);
        assertThat(tokenVersions.isCurrent(1L, 0)).isFalse();
        assertThat(tokenVersions.isCurrent(1L, 1)).isTrue();
    }

    @Test
    void failedSave_leavesTheCacheAlone() {
        // Ahead of the database the cache would reject the user's next fresh login too
        User user = User.builder().id(1L).tokenVersion(0).build();
        when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(0));
        when(userRepository.save(user)).thenThrow(new RuntimeException("db down"));

        try {
            tokenVersions.revokeAll(user);
        } catch (RuntimeException expected) {
            // the caller sees the error
        }

        assertThat(tokenVersions.isCurrent(1L, 0)).isTrue();
    }

    @Test
    void staleReadRacingARevoke_cannotLowerTheVersion() {
        // A lookup reads version 0 from the database, and a password change bumps it
        // to 1 before the lookup gets to cache what it read
        User user = User.builder().id(1L).tokenVersion(0).build();
        when(userRepository.findTokenVersionById(1L)).thenAnswer(inv -> {
            tokenVersions.revokeAll(user);
            return Optional.of(0);
        });

        assertThat(tokenVersions.isCurrent(1L, 0)).isFalse();
        assertThat(tokenVersions.isCurrent(1L, 1)).isTrue();
    }

    @Test
    void forget_rejectsTheDeletedUsersTokensWithoutReadingTheDatabase() {
        when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(0));
        assertThat(tokenVersions.isCurrent(1L, 0)).isTrue();

        tokenVersions.forget(1L);

        assertThat(tokenVersions.isCurrent(1L, 0)).isFalse();
        verify(userRepository, times(1)).findTokenVersionById(1L);
    }
}
