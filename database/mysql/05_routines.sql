USE medmatch;
DROP FUNCTION IF EXISTS fn_age_group;
DROP PROCEDURE IF EXISTS sp_cases_by_diagnosis;
DELIMITER $$

CREATE FUNCTION fn_age_group(age_value TINYINT UNSIGNED)
RETURNS VARCHAR(20) DETERMINISTIC
BEGIN
  RETURN CASE WHEN age_value < 13 THEN 'Child' WHEN age_value < 20 THEN 'Adolescent'
              WHEN age_value < 60 THEN 'Adult' ELSE 'Older adult' END;
END$$

CREATE PROCEDURE sp_cases_by_diagnosis(IN diagnosis_name VARCHAR(255), IN minimum_age INT, IN maximum_age INT)
BEGIN
  SELECT mc.case_code, mc.patient_age, fn_age_group(mc.patient_age) AS age_group,
         mc.patient_gender, mc.symptoms, d.name AS diagnosis, mc.created_at
  FROM medical_cases mc JOIN case_diagnoses cd ON cd.case_id=mc.id JOIN diagnoses d ON d.id=cd.diagnosis_id
  WHERE d.name=diagnosis_name AND mc.patient_age BETWEEN minimum_age AND maximum_age AND mc.deleted_at IS NULL
  ORDER BY mc.created_at DESC;
END$$
DELIMITER ;
