USE medmatch;

-- ALTER demonstration: add a database-level quality flag used during case review.
ALTER TABLE medical_cases ADD COLUMN review_status ENUM('DRAFT','REVIEWED') NOT NULL DEFAULT 'DRAFT' AFTER notes;
ALTER TABLE medical_cases ADD INDEX idx_cases_review_status (review_status);

-- Safe DROP demonstration using a disposable academic table.
CREATE TABLE IF NOT EXISTS ddl_drop_demonstration (id INT PRIMARY KEY, note VARCHAR(100));
DROP TABLE ddl_drop_demonstration;
