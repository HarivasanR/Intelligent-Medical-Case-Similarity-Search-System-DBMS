import "./env";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "../lib/mysql";
import { getMongoDb } from "../lib/mongodb";
import { demoCases } from "../lib/demo-data";
import { createDatabaseCase } from "../services/database-cases";

async function main() {
  const pool = getMySqlPool();
  await pool.execute("INSERT IGNORE INTO roles (id,name,description) VALUES (1,'ADMIN','System administrator'),(2,'STAFF','Doctor or clinical staff')");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (!adminPassword || !staffPassword || adminPassword.length < 12 || staffPassword.length < 12) throw new Error("Run npm run setup to generate seed passwords.");
  const adminHash = await bcrypt.hash(adminPassword, 12); const staffHash = await bcrypt.hash(staffPassword, 12);
  await pool.execute("INSERT INTO users (id,role_id,full_name,email,password_hash) VALUES (1,1,'Dr. Maya Rao','admin@medmatch.test',?),(2,2,'Dr. Arjun Nair','staff@medmatch.test',?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)",[adminHash,staffHash]);
  const [existingCaseRows] = await pool.query<RowDataPacket[]>("SELECT case_code FROM medical_cases");
  const existingCaseIds = new Set(existingCaseRows.map((r) => String(r.case_code)));

  let insertedCount = 0;
  for (const item of demoCases) {
    if (!existingCaseIds.has(item.caseCode)) {
      await createDatabaseCase(
        {
          patientAge: item.patientAge,
          patientGender: item.patientGender,
          category: item.category,
          symptoms: item.symptoms,
          medicalHistory: item.medicalHistory,
          clinicalObservations: item.clinicalObservations,
          diagnosis: item.diagnosis,
          treatment: item.treatment,
          notes: item.notes,
          labResults: item.labResults || {},
          examinationDetails: item.examinationDetails || {},
        },
        item.id % 2 ? 1 : 2,
        item.caseCode
      );
      insertedCount++;
    }
  }
  const mongo = await getMongoDb();
  await mongo.collection("clinical_records").createIndex({ caseId: 1 }, { unique: true });
  console.log(`Seed complete: ${demoCases.length} total demo cases (${insertedCount} newly inserted, ${existingCaseIds.size} already existed).`);
  await pool.end(); process.exit(0);
}
main().catch(()=>{console.error("Seed failed. Check credentials, run db:migrate and ensure all services are available.");process.exit(1)});
