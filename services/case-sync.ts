import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import { ensureCollection, getCollectionName } from "@/lib/qdrant";
import { embeddingService } from "@/services/embedding";
import { caseToSearchText } from "@/services/cases";
import type { MedicalCase } from "@/types";

export type SyncCase = Omit<MedicalCase, "createdBy">;
export async function writeCaseProjection(item: SyncCase, deleted = false) {
  const mongo = await getMongoDb();
  const qdrant = await ensureCollection();
  if (deleted) {
    await mongo.collection("clinical_records").deleteOne({ caseId: item.id });
    await qdrant.delete(getCollectionName(), { wait: true, points: [item.id] });
  } else {
    await mongo.collection("clinical_records").updateOne({ caseId: item.id }, { $set: {
      laboratoryResults: item.labResults ?? {}, examinationDetails: item.examinationDetails ?? {}, createdAt: new Date(item.createdAt),
    } }, { upsert: true });
    await qdrant.upsert(getCollectionName(), { wait: true, points: [{ id: item.id, vector: await embeddingService.embed(caseToSearchText(item)), payload: {
      caseId: item.id, diagnosis: item.diagnosis, age: item.patientAge, gender: item.patientGender, category: item.category, date: item.createdAt,
    } }] });
  }
}

// A MySQL advisory lock serializes replay across web requests and CLI workers.
// Partial external writes are safe: all operations are idempotent; events remain pending.
export async function processCaseSync(limit = 100) {
  const connection = await getMySqlPool().getConnection();
  let locked = false;
  let processed = 0;
  try {
    const [locks] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('medmatch_case_sync', 0) acquired");
    locked = Number(locks[0].acquired) === 1;
    if (!locked) return processed;
    for (; processed < limit; processed++) {
      const [events] = await connection.query<RowDataPacket[]>("SELECT id, operation, payload FROM case_sync_outbox WHERE processed_at IS NULL ORDER BY id LIMIT 1");
      if (!events.length) break;
      const event = events[0];
      try {
        const item = (typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload) as SyncCase;
        await writeCaseProjection(item, event.operation === "DELETE");
        await connection.execute("UPDATE case_sync_outbox SET processed_at=CURRENT_TIMESTAMP, attempts=attempts+1, last_error=NULL WHERE id=?", [event.id]);
      } catch {
        await connection.execute("UPDATE case_sync_outbox SET attempts=attempts+1, last_error='Projection write failed; check MongoDB/Qdrant and retry npm run sync' WHERE id=?", [event.id]);
        break;
      }
    }
    return processed;
  } finally {
    if (locked) await connection.query("SELECT RELEASE_LOCK('medmatch_case_sync')");
    connection.release();
  }
}
