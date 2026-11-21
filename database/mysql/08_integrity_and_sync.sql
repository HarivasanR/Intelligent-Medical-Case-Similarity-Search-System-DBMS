USE medmatch;
ALTER TABLE medical_cases
  ADD CONSTRAINT chk_case_category CHECK (CHAR_LENGTH(TRIM(category)) BETWEEN 2 AND 80),
  ADD CONSTRAINT chk_case_symptoms CHECK (CHAR_LENGTH(TRIM(symptoms)) BETWEEN 10 AND 4000),
  ADD CONSTRAINT chk_case_observations CHECK (CHAR_LENGTH(TRIM(clinical_observations)) BETWEEN 5 AND 4000);
ALTER TABLE users
  ADD CONSTRAINT chk_user_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 2),
  ADD CONSTRAINT chk_user_email CHECK (email LIKE '%_@_%._%'),
  ADD CONSTRAINT chk_password_hash CHECK (password_hash REGEXP '^[$]2[aby][$][0-9]{2}[$]');
ALTER TABLE diagnoses ADD CONSTRAINT chk_diagnosis_name CHECK (CHAR_LENGTH(TRIM(name)) >= 2);
ALTER TABLE treatments ADD CONSTRAINT chk_treatment_description CHECK (CHAR_LENGTH(TRIM(description)) BETWEEN 2 AND 4000);
-- Written in the SAME transaction as the case. External writes are replayable.
CREATE TABLE case_sync_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  operation ENUM('UPSERT','DELETE') NOT NULL,
  payload JSON NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  INDEX idx_sync_pending (processed_at, id),
  CONSTRAINT fk_sync_case FOREIGN KEY (case_id) REFERENCES medical_cases(id)
);
