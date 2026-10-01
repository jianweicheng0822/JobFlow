-- Add user_id to companies so each company is scoped to a single user

ALTER TABLE companies ADD COLUMN user_id BIGINT NULL;

-- Assign any orphan companies to the first registered user
UPDATE companies
SET user_id = (SELECT MIN(id) FROM users)
WHERE user_id IS NULL;

-- Delete companies that still have no owner (happens when users table is empty)
DELETE FROM companies WHERE user_id IS NULL;

-- Now make the column non-nullable and add FK + index
ALTER TABLE companies MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE companies ADD CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users (id);
CREATE INDEX idx_company_user ON companies (user_id);
