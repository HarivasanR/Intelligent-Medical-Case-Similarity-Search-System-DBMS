USE medmatch;

-- The outbox is the durable hand-off between the MySQL system of record
-- and the MongoDB/Qdrant read models. Apply once after 01_schema.sql.
CREATE TABLE IF NOT EXISTS case_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(60) NOT NULL,
  aggregate_id BIGINT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','PROCESSING','COMPLETED','DEAD') NOT NULL DEFAULT 'PENDING',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMP NULL,
  mongo_completed_at TIMESTAMP NULL,
  qdrant_completed_at TIMESTAMP NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_case_outbox_case FOREIGN KEY (aggregate_id) REFERENCES medical_cases(id) ON DELETE CASCADE,
  INDEX idx_case_outbox_claim (status, available_at, id),
  INDEX idx_case_outbox_lease (status, locked_until),
  INDEX idx_case_outbox_aggregate (aggregate_id, event_type)
);
