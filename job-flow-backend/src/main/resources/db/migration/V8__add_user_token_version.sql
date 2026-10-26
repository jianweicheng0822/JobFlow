-- Goes up when a user's existing sign-ins should stop working (e.g. password changed).
-- Every JWT carries the version it was issued with; older ones are rejected.
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
