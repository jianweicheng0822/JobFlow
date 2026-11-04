-- Bug reports and ideas sent from the in-app feedback form. Each one is also emailed
-- to the maintainer; this table is the copy that can't get lost in transit.
-- user_id is set when the sender was logged in. Deleting the account deletes their
-- feedback too, since account deletion is a real delete.
CREATE TABLE feedback (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    type       VARCHAR(10)   NOT NULL,
    message    VARCHAR(1000) NOT NULL,
    email      VARCHAR(254),
    user_id    BIGINT,
    page_url   VARCHAR(500),
    user_agent VARCHAR(300),
    created_at DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_feedback_created_at (created_at),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
