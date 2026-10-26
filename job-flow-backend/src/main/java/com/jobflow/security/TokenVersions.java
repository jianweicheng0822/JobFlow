package com.jobflow.security;

import com.jobflow.model.User;
import com.jobflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Each user's current token version, kept in memory so checking a token doesn't
 * cost every request a database round trip (under load that extra connection
 * borrow was the bottleneck). Only a miss reads the database.
 *
 * In-process on purpose: there's a single backend. With more than one instance
 * this would need a shared store, or one instance would keep accepting tokens
 * another had revoked.
 */
@Component
@RequiredArgsConstructor
public class TokenVersions {

    private final UserRepository userRepository;

    private static final int DELETED = Integer.MAX_VALUE;

    // One small entry per user seen since startup
    private final Map<Long, Integer> versions = new ConcurrentHashMap<>();

    // False for unknown users too, so a deleted account's tokens stop working
    public boolean isCurrent(long userId, int version) {
        Integer current = versions.get(userId);
        if (current == null) {
            current = userRepository.findTokenVersionById(userId).orElse(null);
            if (current == null) {
                return false;
            }
            // Versions only go up, so keep the higher one if a revoke landed meanwhile
            current = versions.merge(userId, current, Math::max);
        }
        return current == version;
    }

    /**
     * Invalidates every token the user has, and saves the user with any other pending
     * changes. Tokens issued from it afterwards carry the new version.
     * The cache is updated only once the save went through: ahead of the database it
     * would reject even fresh logins. And it gets the new value rather than being
     * cleared, and only ever raised, so a request that read the old version while
     * the save was running can't put it back.
     */
    public void revokeAll(User user) {
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        versions.merge(user.getId(), user.getTokenVersion(), Math::max);
    }

    // After the user is deleted (and committed). A tombstone rather than a removal:
    // the max-merge above means a lookup racing the delete can't bring the old version
    // back. Ids aren't reused, so the entry never matches a real token again.
    public void forget(long userId) {
        versions.put(userId, DELETED);
    }
}
