import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(separator + 1).trim();
  }
}

async function main() {
  // Import after loading .env so the embedding provider sees GOOGLE_API_KEY.
  const { getMySqlPool } = await import("../lib/mysql");
  const { processCaseOutboxBatch } = await import("../services/case-outbox");
  const result = await processCaseOutboxBatch(Number(process.env.OUTBOX_BATCH_SIZE || 25));
  console.log(`Outbox worker: claimed ${result.claimed}, completed ${result.completed}`);
  await getMySqlPool().end();
}

main().catch(async (error) => {
  console.error("Outbox worker failed:", error);
  try { const { getMySqlPool } = await import("../lib/mysql"); await getMySqlPool().end(); } catch { /* preserve the original error */ }
  process.exitCode = 1;
});
