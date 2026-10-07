package com.jobflow.service;

import com.jobflow.model.User;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * "Today" and "now" as seen by a particular user.
 *
 * Dates and interview times are stored as the user's local wall-clock values,
 * so comparing them with the server's clock is only right when the server
 * happens to be in the same zone. Use this instead of LocalDate.now() /
 * LocalDateTime.now() for anything user-facing.
 */
@Component
public class UserClock {

    private final Clock clock;

    public UserClock() {
        this(Clock.systemDefaultZone());
    }

    // Tests pass a fixed clock
    UserClock(Clock clock) {
        this.clock = clock;
    }

    // The user's zone, or the server's while they haven't got one (or it's somehow invalid)
    public ZoneId zoneOf(User user) {
        String id = user != null ? user.getTimeZone() : null;
        if (id == null || id.isBlank()) return clock.getZone();
        try {
            return ZoneId.of(id);
        } catch (DateTimeException e) {
            return clock.getZone();
        }
    }

    public LocalDate today(User user) {
        return LocalDate.now(clock.withZone(zoneOf(user)));
    }

    public LocalDateTime now(User user) {
        return LocalDateTime.now(clock.withZone(zoneOf(user)));
    }

    // For server-side windows that must not depend on the server's or DB's zone
    public LocalDateTime nowUtc() {
        return LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
    }

    // Checks an IANA id like "Asia/Shanghai" (case-sensitive) and returns it normalized
    public static String requireValidZone(String id) {
        try {
            return ZoneId.of(id.trim()).getId();
        } catch (DateTimeException | NullPointerException e) {
            throw new IllegalArgumentException("Unknown time zone: " + id);
        }
    }
}
