import "./env";
import { ensureCollection, getCollectionName } from "../lib/qdrant";
import { listDatabaseCases } from "../services/database-cases";
import { caseToSearchText } from "../services/cases";
import { embeddingService } from "../services/embedding";

// Rebuilds the Qdrant index from the cases currently in MySQL, so vector IDs always match MySQL IDs.
async function main() {
  const client = await ensureCollection();
  const cases = (await listDatabaseCases()).filter(c => !c.syncPending);
  const points = [];
  for (const item of cases) {
    points.push({ id: item.id, vector: await embeddingService.embed(caseToSearchText(item)), payload: { caseId: item.id, diagnosis: item.diagnosis, age: item.patientAge, gender: item.patientGender, category: item.category, date: item.createdAt } });
  }
  if (points.length) await client.upsert(getCollectionName(), { wait: true, points });
  console.log(`Indexed ${points.length} vectors in ${getCollectionName()}.`);
  process.exit(0);
}
main().catch(() => { console.error("Vector rebuild failed. Check database and collection configuration."); process.exit(1); });
