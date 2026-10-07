package com.jobflow.service;

import com.jobflow.model.User;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserClockTest {

    // 01:30 UTC on Oct 7 = 7:30pm Oct 6 in Denver = 9:30am Oct 7 in Shanghai
    private final UserClock clock = new UserClock(
            Clock.fixed(Instant.parse("2026-10-07T01:30:00Z"), ZoneOffset.UTC));

    private static User userIn(String zone) {
        return User.builder().id(1L).email("u@test.com").name("U").timeZone(zone).build();
    }

    @Test
    void today_followsTheUsersZone() {
        assertThat(clock.today(userIn("America/Denver"))).isEqualTo(LocalDate.of(2026, 10, 6));
        assertThat(clock.today(userIn("Asia/Shanghai"))).isEqualTo(LocalDate.of(2026, 10, 7));
    }

    @Test
    void now_isTheUsersWallClock() {
        assertThat(clock.now(userIn("America/Denver"))).isEqualTo(LocalDateTime.of(2026, 10, 6, 19, 30));
        assertThat(clock.now(userIn("Asia/Shanghai"))).isEqualTo(LocalDateTime.of(2026, 10, 7, 9, 30));
    }

    @Test
    void missingZone_fallsBackToServerZone() {
        assertThat(clock.zoneOf(userIn(null))).isEqualTo(ZoneOffset.UTC);
        assertThat(clock.zoneOf(userIn("  "))).isEqualTo(ZoneOffset.UTC);
        assertThat(clock.zoneOf(null)).isEqualTo(ZoneOffset.UTC);
        assertThat(clock.today(userIn(null))).isEqualTo(LocalDate.of(2026, 10, 7));
    }

    @Test
    void invalidStoredZone_fallsBackInsteadOfFailing() {
        assertThat(clock.zoneOf(userIn("Mars/Olympus_Mons"))).isEqualTo(ZoneOffset.UTC);
    }

    @Test
    void requireValidZone_acceptsAndNormalizesRealZones() {
        assertThat(UserClock.requireValidZone(" America/Denver ")).isEqualTo("America/Denver");
        assertThat(ZoneId.of(UserClock.requireValidZone("Europe/London"))).isNotNull();
    }

    @Test
    void requireValidZone_rejectsUnknownZones() {
        assertThatThrownBy(() -> UserClock.requireValidZone("Mars/Olympus_Mons"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unknown time zone: Mars/Olympus_Mons");
        assertThatThrownBy(() -> UserClock.requireValidZone("asia/shanghai"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
