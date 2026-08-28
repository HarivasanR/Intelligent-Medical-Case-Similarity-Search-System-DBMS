USE medmatch;
DELIMITER $$

CREATE TRIGGER trg_medical_case_after_update
AFTER UPDATE ON medical_cases FOR EACH ROW
BEGIN
  IF NOT (OLD.symptoms <=> NEW.symptoms) OR NOT (OLD.clinical_observations <=> NEW.clinical_observations) OR OLD.deleted_at <> NEW.deleted_at THEN
    INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (NEW.created_by, IF(NEW.deleted_at IS NULL, 'UPDATE', 'DELETE'), 'medical_case', NEW.id,
            JSON_OBJECT('caseCode', NEW.case_code, 'updatedAt', NEW.updated_at));
  END IF;
END$$
DELIMITER ;
