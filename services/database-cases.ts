import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import { getQdrant } from "@/lib/qdrant";
import { embeddingService } from "@/services/embedding";
import type { MedicalCase } from "@/types";

export async function createDatabaseCase(input: Omit<MedicalCase, "id" | "caseCode" | "createdAt" | "createdBy">, userId: number) {
  const pool = getMySqlPool();
  const connection = await pool.getConnection();
  let caseId = 0;
  try {
    await connection.beginTransaction();
    const code = `MC-${Date.now().toString().slice(-8)}`;
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO medical_cases (case_code, patient_age, patient_gender, category, symptoms, medical_history, clinical_observations, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, input.patientAge, input.patientGender, input.category, input.symptoms, input.medicalHistory, input.clinicalObservations, input.notes, userId]
    );
    caseId = result.insertId;
    const [diagnosis] = await connection.execute<ResultSetHeader>("INSERT INTO diagnoses (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [input.diagnosis]);
    const [treatment] = await connection.execute<ResultSetHeader>("INSERT INTO treatments (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [input.treatment.slice(0, 250), input.treatment]);
    await connection.execute("INSERT INTO case_diagnoses (case_id, diagnosis_id, is_primary) VALUES (?, ?, TRUE)", [caseId, diagnosis.insertId]);
    await connection.execute("INSERT INTO case_treatments (case_id, treatment_id) VALUES (?, ?)", [caseId, treatment.insertId]);
    await connection.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'CREATE', 'medical_case', ?, JSON_OBJECT('caseCode', ?))", [userId, caseId, code]);
    await connection.commit();

    const mongo = await getMongoDb();
    await mongo.collection("clinical_records").insertOne({ caseId, laboratoryResults: input.labResults, examinationDetails: input.examinationDetails, createdAt: new Date() });
    const vector = await embeddingService.embed([input.symptoms, input.medicalHistory, input.clinicalObservations, input.diagnosis, input.treatment].join(" "));
    await getQdrant().upsert(process.env.QDRANT_COLLECTION || "medical_cases", { wait: true, points: [{ id: caseId, vector, payload: { caseId, diagnosis: input.diagnosis, age: input.patientAge, gender: input.patientGender, category: input.category } }] });
    return { id: caseId, caseCode: code };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function listDatabaseCases(): Promise<MedicalCase[]> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`
    SELECT mc.id, mc.case_code, mc.patient_age, mc.patient_gender, mc.category, mc.symptoms,
      mc.medical_history, mc.clinical_observations, mc.notes, mc.created_at,
      u.full_name created_by, d.name diagnosis, t.description treatment
    FROM medical_cases mc JOIN users u ON u.id=mc.created_by
    LEFT JOIN case_diagnoses cd ON cd.case_id=mc.id AND cd.is_primary=TRUE LEFT JOIN diagnoses d ON d.id=cd.diagnosis_id
    LEFT JOIN case_treatments ct ON ct.case_id=mc.id LEFT JOIN treatments t ON t.id=ct.treatment_id
    WHERE mc.deleted_at IS NULL ORDER BY mc.created_at DESC`);
  return rows.map((r) => ({ id: r.id, caseCode: r.case_code, patientAge: r.patient_age, patientGender: r.patient_gender, category: r.category, symptoms: r.symptoms, medicalHistory: r.medical_history || "", clinicalObservations: r.clinical_observations, diagnosis: r.diagnosis || "Pending", treatment: r.treatment || "Not recorded", notes: r.notes || "", createdAt: new Date(r.created_at).toISOString(), createdBy: r.created_by }));
}
