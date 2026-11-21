import "./env";
import fs from "node:fs";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getMongoDb } from "../lib/mongodb";
import schema from "../database/mongodb/model.json";

async function main() {
  if (!process.env.MYSQL_ROOT_PASSWORD) throw new Error("MYSQL_ROOT_PASSWORD is required for migration.");
  const url = new URL(process.env.MYSQL_URL!);
  url.username = "root"; url.password = process.env.MYSQL_ROOT_PASSWORD;
  const connection = await mysql.createConnection({ uri: url.toString(), multipleStatements: true });
  try {
    // Check each named constraint so interrupted nontransactional DDL can resume safely.
    const sql = fs.readFileSync("database/mysql/08_integrity_and_sync.sql", "utf8").replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) {
      const alter = statement.match(/^ALTER TABLE (\w+)\s+([\s\S]+)$/);
      if (alter) {
        for (let part of alter[2].split(/,\s*ADD CONSTRAINT/)) {
          if (!part.startsWith("ADD CONSTRAINT")) part = `ADD CONSTRAINT ${part.trim()}`;
          const name = part.match(/^ADD CONSTRAINT (\w+)/)![1];
          const [existing] = await connection.query<RowDataPacket[]>("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?", [alter[1], name]);
          if (!existing.length) await connection.query(`ALTER TABLE ${alter[1]} ${part}`);
        }
      } else await connection.query(statement.replace("CREATE TABLE case_sync_outbox", "CREATE TABLE IF NOT EXISTS case_sync_outbox"));
    }
    // DELIMITER is a CLI command; the driver sends the compound statement directly.
    const trigger = fs.readFileSync("database/mysql/04_triggers.sql", "utf8").replace(/^DELIMITER.*$/gm, "").replaceAll("$$", ";");
    await connection.query(trigger);
    const mongo = await getMongoDb();
    if (!(await mongo.listCollections({ name: "clinical_records" }).toArray()).length) await mongo.createCollection("clinical_records");
    await mongo.command({ collMod: "clinical_records", validator: { $jsonSchema: schema }, validationLevel: "strict", validationAction: "error" });
    await mongo.collection("clinical_records").createIndex({ caseId: 1 }, { unique: true });
    await mongo.collection("clinical_records").createIndex({ createdAt: -1 });
    console.log("SQL migration and MongoDB validation/indexes are installed.");
  } finally { await connection.end(); }
}
main().then(() => process.exit(0)).catch(() => { console.error("Migration failed. Check database availability, root credentials, existing constraints and legacy data. No volumes were reset."); process.exit(1); });
