import "./env";
import { processCaseSync } from "../services/case-sync";
import { getMySqlPool } from "../lib/mysql";
import type { RowDataPacket } from "mysql2";
async function main() {
  const processed = await processCaseSync(10000);
  const [rows] = await getMySqlPool().query<RowDataPacket[]>("SELECT COUNT(*) pending FROM case_sync_outbox WHERE processed_at IS NULL");
  console.log(`Processed ${processed} events; ${rows[0].pending} pending.`);
  process.exit(Number(rows[0].pending) ? 1 : 0);
}
main().catch(() => { console.error("Sync failed. Check database configuration and run db:migrate first."); process.exit(1); });
