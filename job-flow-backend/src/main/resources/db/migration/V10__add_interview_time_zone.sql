-- The zone an interview's time is in, e.g. "America/Los_Angeles" for a 10 AM
-- call with a US company booked from Shanghai. interview_date stays the time
-- on that clock, so the actual moment is interview_date in time_zone.
--
-- Until now every interview time was on its user's own clock, so fill that in.
-- Users without a zone yet stay NULL, which still means "the user's zone".
ALTER TABLE interviews ADD COLUMN time_zone VARCHAR(64) NULL;

UPDATE interviews i
JOIN job_applications ja ON i.job_application_id = ja.id
JOIN users u ON ja.user_id = u.id
SET i.time_zone = u.time_zone
WHERE u.time_zone IS NOT NULL;
