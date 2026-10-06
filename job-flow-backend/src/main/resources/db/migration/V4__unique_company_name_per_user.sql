-- One company per name per user.
--
-- Concurrent "find or create" calls could insert the same company twice, and
-- once a user had duplicates every lookup by that name failed. Clean up what's
-- there, then let the database enforce it. The column collation is
-- case-insensitive, so "Acme" and "acme" count as the same name, which matches
-- the findByNameIgnoreCase lookups in the code.

-- 1. Names are trimmed on save now; do the same for older rows
UPDATE companies SET name = TRIM(name) WHERE name <> TRIM(name);

-- 2. Keep the oldest company in each duplicate group and move applications onto it
UPDATE job_applications ja
JOIN companies c ON ja.company_id = c.id
JOIN (
    SELECT user_id, name, MIN(id) AS keep_id
    FROM companies
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
) keeper ON keeper.user_id = c.user_id AND keeper.name = c.name
SET ja.company_id = keeper.keep_id
WHERE c.id <> keeper.keep_id;

-- 3. Drop the now-unused copies
DELETE c FROM companies c
JOIN (
    SELECT user_id, name, MIN(id) AS keep_id
    FROM companies
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
) keeper ON keeper.user_id = c.user_id AND keeper.name = c.name
WHERE c.id <> keeper.keep_id;

-- 4. Stop it from happening again
ALTER TABLE companies ADD CONSTRAINT uk_company_user_name UNIQUE (user_id, name);
