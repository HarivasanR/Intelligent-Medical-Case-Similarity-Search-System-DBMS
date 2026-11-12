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

import { ensureCollection, getCollectionName } from "../lib/qdrant";
import { listDatabaseCases } from "../services/database-cases";
import { caseToSearchText } from "../services/cases";
import { embeddingService } from "../services/embedding";

// Rebuilds the Qdrant index from the cases currently in MySQL, so vector IDs always match MySQL IDs.
async function main() {
  const client = await ensureCollection();
  const cases = await listDatabaseCases();
  const points = [];
  for (const item of cases) {
    points.push({ id: item.id, vector: await embeddingService.embed(caseToSearchText(item)), payload: { caseId: item.id, diagnosis: item.diagnosis, age: item.patientAge, gender: item.patientGender, category: item.category, date: item.createdAt } });
  }
  if (points.length) await client.upsert(getCollectionName(), { wait: true, points });
  console.log(`Indexed ${points.length} vectors in ${getCollectionName()}.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
