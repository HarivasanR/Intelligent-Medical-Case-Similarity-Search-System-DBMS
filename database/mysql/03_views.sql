USE medmatch;

CREATE OR REPLACE VIEW v_case_summary AS
SELECT mc.id, mc.case_code, mc.patient_age, mc.patient_gender, mc.category,
       mc.symptoms, mc.created_at, u.full_name AS created_by,
       GROUP_CONCAT(DISTINCT d.name ORDER BY cd.is_primary DESC SEPARATOR ', ') AS diagnoses,
       COUNT(DISTINCT ct.treatment_id) AS treatment_count
FROM medical_cases mc
JOIN users u ON u.id = mc.created_by
LEFT JOIN case_diagnoses cd ON cd.case_id = mc.id
LEFT JOIN diagnoses d ON d.id = cd.diagnosis_id
LEFT JOIN case_treatments ct ON ct.case_id = mc.id
WHERE mc.deleted_at IS NULL
GROUP BY mc.id, mc.case_code, mc.patient_age, mc.patient_gender, mc.category, mc.symptoms, mc.created_at, u.full_name;

CREATE OR REPLACE VIEW v_diagnosis_statistics AS
SELECT d.id, d.name, COUNT(cd.case_id) AS case_count,
       ROUND(AVG(mc.patient_age), 1) AS average_patient_age,
       MAX(mc.created_at) AS latest_case_at
FROM diagnoses d
LEFT JOIN case_diagnoses cd ON cd.diagnosis_id = d.id
LEFT JOIN medical_cases mc ON mc.id = cd.case_id AND mc.deleted_at IS NULL
GROUP BY d.id, d.name;

CREATE OR REPLACE VIEW v_search_statistics AS
SELECT DATE(created_at) AS search_date, search_type, COUNT(*) AS search_count,
       ROUND(AVG(result_count), 1) AS average_results,
       ROUND(AVG(execution_ms), 1) AS average_execution_ms
FROM search_history GROUP BY DATE(created_at), search_type;
