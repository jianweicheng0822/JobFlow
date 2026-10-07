-- Each user's IANA time zone (e.g. "America/Denver"), so "today", upcoming
-- interviews and reminders follow the user's clock instead of the server's.
-- NULL until the frontend fills it in on the next login; the backend falls
-- back to the server's zone until then.
ALTER TABLE users ADD COLUMN time_zone VARCHAR(64) NULL;
