import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import { ensureCollection, getCollectionName } from "@/lib/qdrant";
import { caseToSearchText } from "@/services/cases";
import { embeddingService } from "@/services/embedding";

interface CaseOutboxPayload {
  caseId: number;
  caseCode: string;
  caseData: {
    patientAge: number;
    patientGender: "MALE" | "FEMALE" | "OTHER";
    category: string;
    symptoms: string;
    medicalHistory: string;
    clinicalObservations: string;
    diagnosis: string;
    treatment: string;
    notes: string;
    labResults: Record<string, string | number>;
    examinationDetails: Record<string, string>;
  };
}

interface OutboxRow extends RowDataPacket {
  id: number;
  aggregate_id: number;
  payload: CaseOutboxPayload | string;
  attempts: number;
  mongo_completed_at: Date | null;
  qdrant_completed_at: Date | null;
}

/**
 * Claims one event using a short MySQL transaction and SKIP LOCKED. A lease
 * makes abandoned PROCESSING rows recoverable after a worker crash.
 */
async function claimNextEvent(): Promise<OutboxRow | null> {
  const pool = getMySqlPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE case_outbox
          SET status = 'DEAD', locked_until = NULL,
              last_error = COALESCE(last_error, 'Worker lease expired after maximum attempts')
        WHERE status = 'PROCESSING' AND locked_until < NOW() AND attempts >= max_attempts`,
    );
    const [rows] = await connection.query<OutboxRow[]>(
      `SELECT id, aggregate_id, payload, attempts, mongo_completed_at, qdrant_completed_at
         FROM case_outbox
        WHERE ((status = 'PENDING' AND available_at <= NOW() AND attempts < max_attempts)
           OR (status = 'PROCESSING' AND locked_until < NOW() AND attempts < max_attempts))
        ORDER BY id
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
    );
    const event = rows[0];
    if (!event) {
      await connection.commit();
      return null;
    }
    await connection.execute(
      `UPDATE case_outbox
          SET status = 'PROCESSING', attempts = attempts + 1,
              locked_until = DATE_ADD(NOW(), INTERVAL 2 MINUTE)
        WHERE id = ?`,
      [event.id],
    );
    await connection.commit();
    return event;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function parsePayload(payload: CaseOutboxPayload | string): CaseOutboxPayload {
  return typeof payload === "string" ? JSON.parse(payload) as CaseOutboxPayload : payload;
}

async function markDestination(eventId: number, destination: "mongo" | "qdrant") {
  const column = destination === "mongo" ? "mongo_completed_at" : "qdrant_completed_at";
  await getMySqlPool().execute(
    `UPDATE case_outbox SET ${column} = COALESCE(${column}, NOW()), last_error = NULL WHERE id = ?`,
    [eventId],
  );
}

async function processEvent(event: OutboxRow) {
  const payload = parsePayload(event.payload);
  const { caseId, caseCode, caseData } = payload;

  try {
    // Each destination has its own durable completion marker. If one succeeds
    // and the other fails, the next attempt only retries the unfinished side.
    if (!event.mongo_completed_at) {
      const mongo = await getMongoDb();
      const clinicalRecords = mongo.collection("clinical_records");
      await clinicalRecords.createIndex({ caseId: 1 }, { unique: true });
      await clinicalRecords.replaceOne(
        { caseId },
        {
          caseId,
          caseCode,
          laboratoryResults: caseData.labResults,
          examinationDetails: caseData.examinationDetails,
          createdAt: new Date(),
        },
        { upsert: true },
      );
      await markDestination(event.id, "mongo");
    }

    if (!event.qdrant_completed_at) {
      const vector = await embeddingService.embed(caseToSearchText(caseData));
      const qdrant = await ensureCollection();
      await qdrant.upsert(getCollectionName(), {
        wait: true,
        points: [{
          id: caseId,
          vector,
          payload: {
            caseId,
            diagnosis: caseData.diagnosis,
            age: caseData.patientAge,
            gender: caseData.patientGender,
            category: caseData.category,
          },
        }],
      });
      await markDestination(event.id, "qdrant");
    }

    await getMySqlPool().execute(
      `UPDATE case_outbox
          SET status = 'COMPLETED', completed_at = NOW(),
              locked_until = NULL, last_error = NULL
        WHERE id = ? AND mongo_completed_at IS NOT NULL AND qdrant_completed_at IS NOT NULL`,
      [event.id],
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown outbox processing error";
    const nextAttempt = event.attempts + 1;
    const delaySeconds = Math.min(3600, 5 * (2 ** Math.max(0, nextAttempt - 1)));
    await getMySqlPool().execute(
      `UPDATE case_outbox
          SET status = IF(attempts >= max_attempts, 'DEAD', 'PENDING'),
              available_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
              locked_until = NULL, last_error = ?
        WHERE id = ?`,
      [delaySeconds, message.slice(0, 4000), event.id],
    );
    console.error(`Outbox event ${event.id} failed (attempt ${nextAttempt}):`, message);
    return false;
  }
}

/** Process up to limit events. Safe to run from multiple worker processes. */
export async function processCaseOutboxBatch(limit = 25): Promise<{ claimed: number; completed: number }> {
  let claimed = 0;
  let completed = 0;
  while (claimed < limit) {
    const event = await claimNextEvent();
    if (!event) break;
    claimed++;
    if (await processEvent(event)) completed++;
  }
  return { claimed, completed };
}
