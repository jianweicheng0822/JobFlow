-- Link to the job posting the user applied through (LinkedIn, Greenhouse, a careers page...).
-- 2048 because tracking-heavy job board links get long. NULL when none was saved.
ALTER TABLE job_applications ADD COLUMN job_url VARCHAR(2048) NULL;
