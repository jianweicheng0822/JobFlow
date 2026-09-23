ALTER TABLE interviews
    ADD COLUMN reminder_enabled      BIT NOT NULL DEFAULT 0,
    ADD COLUMN reminder_hours_before INT NOT NULL DEFAULT 24,
    ADD COLUMN reminder_sent         BIT NOT NULL DEFAULT 0;

CREATE INDEX idx_interview_reminder
    ON interviews (reminder_enabled, reminder_sent, interview_date);
