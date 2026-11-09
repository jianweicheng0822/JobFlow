-- ISO 4217 code for the salary, e.g. "USD" or "CNY". The salary itself stays
-- free text ("$150,000/yr", "30k×15"); this just says which money it's in.
-- NULL for older rows, whose text usually carries its own "$".
ALTER TABLE job_applications ADD COLUMN salary_currency VARCHAR(3) NULL;
