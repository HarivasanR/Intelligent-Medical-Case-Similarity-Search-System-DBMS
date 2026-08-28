import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "../lib/mysql";
import { getMongoDb } from "../lib/mongodb";
import { demoCases } from "../lib/demo-data";
import { createDatabaseCase } from "../services/database-cases";

async function main() {
  const pool = getMySqlPool();
  await pool.execute("INSERT IGNORE INTO roles (id,name,description) VALUES (1,'ADMIN','System administrator'),(2,'STAFF','Doctor or clinical staff')");
  const adminHash = await bcrypt.hash("Admin@123", 12); const staffHash = await bcrypt.hash("Staff@123", 12);
  await pool.execute("INSERT INTO users (id,role_id,full_name,email,password_hash) VALUES (1,1,'Dr. Maya Rao','admin@medmatch.test',?),(2,2,'Dr. Arjun Nair','staff@medmatch.test',?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)",[adminHash,staffHash]);
  const [countRows] = await pool.query<(RowDataPacket & { count: number })[]>("SELECT COUNT(*) count FROM medical_cases");
  if (Number(countRows[0].count) === 0) {
    for (const item of demoCases) {
      await createDatabaseCase({ patientAge:item.patientAge, patientGender:item.patientGender, category:item.category, symptoms:item.symptoms, medicalHistory:item.medicalHistory, clinicalObservations:item.clinicalObservations, diagnosis:item.diagnosis, treatment:item.treatment, notes:item.notes, labResults:item.labResults||{}, examinationDetails:item.examinationDetails||{} }, item.id%2?1:2);
    }
  }
  const mongo = await getMongoDb();
  await mongo.collection("clinical_records").createIndex({ caseId: 1 }, { unique: true });
  console.log(`Seed complete: ${demoCases.length} synthetic cases available.`);
  await pool.end(); process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1)});
