-- Short-lived, single-use codes that stand in for a JWT wherever one would end up in a URL:
-- the OAuth login redirect (exchanged for a JWT) and the Gmail link "state" parameter.
-- Only a SHA-256 hash of each code is stored, so a leaked row can't be replayed.
CREATE TABLE one_time_codes (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    code_hash  VARCHAR(64) NOT NULL,
    purpose    VARCHAR(32) NOT NULL,
    user_id    BIGINT      NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_otc_code_hash (code_hash),
    KEY idx_otc_expires_at (expires_at),
    CONSTRAINT fk_otc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
