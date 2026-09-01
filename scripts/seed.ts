import fs from "fs";
import path from "path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

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
  const [existingCaseRows] = await pool.query<RowDataPacket[]>("SELECT id FROM medical_cases");
  const existingCaseIds = new Set(existingCaseRows.map((r) => Number(r.id)));

  let insertedCount = 0;
  for (const item of demoCases) {
    if (!existingCaseIds.has(item.id)) {
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
        item.id % 2 ? 1 : 2
      );
      insertedCount++;
    }
  }
  const mongo = await getMongoDb();
  await mongo.collection("clinical_records").createIndex({ caseId: 1 }, { unique: true });
  console.log(`Seed complete: ${demoCases.length} total demo cases (${insertedCount} newly inserted, ${existingCaseIds.size} already existed).`);
  await pool.end(); process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1)});
