USE medmatch;

CREATE INDEX idx_cases_category_date ON medical_cases(category, created_at DESC);
CREATE INDEX idx_cases_demographics ON medical_cases(patient_gender, patient_age);
CREATE INDEX idx_cases_created_by ON medical_cases(created_by);
CREATE INDEX idx_search_user_date ON search_history(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE FULLTEXT INDEX ftx_case_clinical_text ON medical_cases(symptoms, medical_history, clinical_observations, notes);
