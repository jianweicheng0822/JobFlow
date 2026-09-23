-- V1: Initial schema for JobFlow
-- Tables ordered by foreign key dependencies

-- 1. users (no FK dependencies)
CREATE TABLE users (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255),
    name       VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    job_title  VARCHAR(255),
    bio        TEXT,
    provider   VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255),
    google_access_token  TEXT,
    google_refresh_token TEXT,
    gmail_connected BIT NOT NULL DEFAULT 0,
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. companies (no FK dependencies)
CREATE TABLE companies (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    logo_url   VARCHAR(255),
    location   VARCHAR(255),
    website    VARCHAR(255),
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. job_applications (depends on users, companies)
CREATE TABLE job_applications (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    position_title VARCHAR(255) NOT NULL,
    user_id        BIGINT       NOT NULL,
    company_id     BIGINT       NOT NULL,
    location       VARCHAR(255),
    salary         VARCHAR(255),
    status         VARCHAR(255) NOT NULL,
    applied_date   DATE,
    last_action    VARCHAR(255),
    notes          TEXT,
    starred        BIT          NOT NULL DEFAULT 0,
    created_at     DATETIME(6),
    updated_at     DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_ja_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_ja_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_ja_user_updated      ON job_applications (user_id, updated_at);
CREATE INDEX idx_ja_user_status       ON job_applications (user_id, status);
CREATE INDEX idx_ja_user_applied_date ON job_applications (user_id, applied_date);
CREATE INDEX idx_ja_company           ON job_applications (company_id);

-- 4. interviews (depends on job_applications)
CREATE TABLE interviews (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    job_application_id BIGINT       NOT NULL,
    interview_date     DATETIME(6)  NOT NULL,
    interview_type     VARCHAR(255) NOT NULL,
    notes              TEXT,
    created_at         DATETIME(6),
    updated_at         DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_interview_app FOREIGN KEY (job_application_id) REFERENCES job_applications (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_interview_app ON interviews (job_application_id);

-- 5. email_import_logs (depends on users, job_applications)
CREATE TABLE email_import_logs (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    user_id            BIGINT       NOT NULL,
    gmail_message_id   VARCHAR(255) NOT NULL,
    job_application_id BIGINT,
    imported_at        DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_eil_user_message (user_id, gmail_message_id),
    CONSTRAINT fk_eil_user FOREIGN KEY (user_id)            REFERENCES users (id),
    CONSTRAINT fk_eil_app  FOREIGN KEY (job_application_id) REFERENCES job_applications (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_eil_app ON email_import_logs (job_application_id);
