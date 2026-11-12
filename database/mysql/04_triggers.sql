USE medmatch;
DROP TRIGGER IF EXISTS trg_medical_case_after_update;
DELIMITER $$

CREATE TRIGGER trg_medical_case_after_update
AFTER UPDATE ON medical_cases FOR EACH ROW
BEGIN
  -- <=> is NULL-safe equality: plain <> returns NULL when deleted_at goes from NULL to a date, which would skip the audit row.
  IF NOT (OLD.symptoms <=> NEW.symptoms) OR NOT (OLD.clinical_observations <=> NEW.clinical_observations) OR NOT (OLD.deleted_at <=> NEW.deleted_at) THEN
    INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (NEW.created_by, IF(NEW.deleted_at IS NULL, 'UPDATE', 'DELETE'), 'medical_case', NEW.id,
            JSON_OBJECT('caseCode', NEW.case_code, 'updatedAt', NEW.updated_at));
  END IF;
END$$
DELIMITER ;
