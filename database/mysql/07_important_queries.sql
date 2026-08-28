USE medmatch;

-- JOIN + GROUP BY + aggregate + ORDER BY: most common diagnoses.
SELECT d.name, COUNT(*) AS case_count
FROM diagnoses d JOIN case_diagnoses cd ON cd.diagnosis_id=d.id
GROUP BY d.id, d.name ORDER BY case_count DESC;

-- HAVING: diagnoses represented by more than three cases.
SELECT d.name, COUNT(cd.case_id) AS case_count
FROM diagnoses d JOIN case_diagnoses cd ON cd.diagnosis_id=d.id
GROUP BY d.id, d.name HAVING COUNT(cd.case_id) > 3 ORDER BY case_count DESC;

-- Subquery: cases older than the average age for their category.
SELECT mc.case_code, mc.category, mc.patient_age
FROM medical_cases mc
WHERE mc.patient_age > (SELECT AVG(inner_case.patient_age) FROM medical_cases inner_case WHERE inner_case.category=mc.category)
ORDER BY mc.category, mc.patient_age DESC;

-- FULLTEXT search: natural-language keyword retrieval.
SELECT case_code, symptoms, MATCH(symptoms, medical_history, clinical_observations, notes)
  AGAINST ('persistent cough fever breathing' IN NATURAL LANGUAGE MODE) AS relevance
FROM medical_cases
WHERE MATCH(symptoms, medical_history, clinical_observations, notes)
  AGAINST ('persistent cough fever breathing' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;

-- DML examples used in application workflows.
INSERT INTO search_history(user_id, query_text, search_type, result_count) VALUES (1, 'fever and cough', 'KEYWORD', 4);
UPDATE medical_cases SET review_status='REVIEWED' WHERE case_code='MC-0001';
DELETE FROM search_history WHERE created_at < CURRENT_TIMESTAMP - INTERVAL 365 DAY;
