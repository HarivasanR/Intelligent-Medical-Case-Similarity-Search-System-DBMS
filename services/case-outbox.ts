import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { processCaseSync } from "@/services/case-sync";

/** Use the canonical ordered queue for creates, edits and deletions alike. */
export async function processCaseOutboxBatch(limit = 25): Promise<{ claimed: number; completed: number }> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>("SELECT COUNT(*) n FROM case_sync_outbox WHERE processed_at IS NULL");
  const available = Number(rows[0].n);
  const completed = await processCaseSync(limit);
  return { claimed: Math.min(available, limit), completed };
}
