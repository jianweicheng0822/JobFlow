-- OAuth sign-in now finds users by their provider account first, email second
CREATE INDEX idx_users_provider_identity ON users (provider, provider_id);
