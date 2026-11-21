import "./env";
import { processCaseOutboxBatch } from "../services/case-outbox";
const limit = Number(process.env.OUTBOX_BATCH_SIZE || 25);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("OUTBOX_BATCH_SIZE must be an integer from 1 to 10000");
processCaseOutboxBatch(limit).then(result => {
  console.log(`Processed ${result.completed} pending events.`);
  process.exit(result.completed < result.claimed ? 1 : 0);
}).catch(() => { console.error("Outbox processing failed. Check database services and run db:migrate."); process.exit(1); });
