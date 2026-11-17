import "./env";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import type { RowDataPacket } from "mysql2";
import { getMySqlPool } from "../lib/mysql";
import { getMongoDb } from "../lib/mongodb";
import { getQdrant, getCollectionName } from "../lib/qdrant";
import { processCaseSync } from "../services/case-sync";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const results: string[] = [];
const pool = getMySqlPool();
async function check(name: string, run: () => Promise<void>) { await run(); results.push(name); console.log(`PASS ${name}`); }
async function request(path: string, method = "GET", cookie = "", body?: unknown) {
  return fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
}
async function login(email: string, password: string) {
  const r = await request("/api/auth/login", "POST", "", { email, password });
  assert.equal(r.status, 200, "Database login must succeed; start server with DATA_MODE=database.");
  const cookie = r.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie); return cookie;
}
async function main() {
  const admin = await login("admin@medmatch.test", process.env.SEED_ADMIN_PASSWORD!);
  const staff = await login("staff@medmatch.test", process.env.SEED_STAFF_PASSWORD!);
  const mongo = await getMongoDb();
  let id = 0;
  let transientUser = 0;
  let qdrantStopped = false;
  try {
    await check("Authentication, role restrictions and cross-origin protection", async () => {
      assert.equal((await request("/api/cases")).status, 401);
      assert.equal((await request("/api/admin/users", "GET", staff)).status, 403);
      assert.equal((await request("/api/admin/sync", "POST", staff)).status, 403);
      const r = await fetch(`${base}/api/admin/sync`, { method: "POST", headers: { Cookie: admin, Origin: "https://example.invalid" } });
      assert.equal(r.status, 403);
    });
    const input = { patientAge: 42, patientGender: "FEMALE", category: "Respiratory", symptoms: "Persistent cough fever and difficulty breathing", medicalHistory: "Synthetic integration fixture", clinicalObservations: "Crackles at right lung base", diagnosis: "Synthetic pneumonia", treatment: "Synthetic reference plan", notes: "Automated test fixture", labResults: { summary: "Elevated white-cell count", wbc: 12 }, examinationDetails: { summary: "Synthetic examination" } };
    await check("Case INSERT persists in MySQL, MongoDB and Qdrant", async () => {
      const r = await request("/api/cases", "POST", staff, input);
      assert.equal(r.status, 201); const body = await r.json(); assert.equal(body.demo, undefined);
      id = body.item.id; assert.equal(body.item.syncPending, false);
      assert.ok(await mongo.collection("clinical_records").findOne({ caseId: id }));
      assert.equal((await getQdrant().retrieve(getCollectionName(), { ids: [id] })).length, 1);
    });
    await check("Case UPDATE changes relational, clinical and vector data", async () => {
      input.symptoms = "Updated persistent cough fever and difficulty breathing";
      input.labResults.wbc = 15;
      const r = await request(`/api/cases/${id}`, "PUT", staff, input); assert.equal(r.status, 200);
      assert.equal((await r.json()).item.syncPending, false);
      const [rows] = await pool.query<RowDataPacket[]>("SELECT symptoms FROM medical_cases WHERE id=?", [id]);
      assert.equal(rows[0].symptoms, input.symptoms);
      assert.equal((await mongo.collection("clinical_records").findOne({ caseId: id }))?.laboratoryResults.wbc, 15);
      assert.equal((await getQdrant().retrieve(getCollectionName(), { ids: [id], with_payload: true }))[0].payload?.caseId, id);
    });
    await check("API validation rejects invalid age and reversed search range", async () => {
      assert.equal((await request("/api/cases", "POST", staff, { ...input, patientAge: 150 })).status, 400);
      assert.equal((await request("/api/search/similar", "POST", staff, { query: "fever cough", minAge: 60, maxAge: 20 })).status, 400);
    });
    await check("Filtered vector search records private history; ownership-scoped SQL DELETE", async () => {
      const r = await request("/api/search/similar", "POST", staff, { query: input.symptoms, gender: "FEMALE", category: "Respiratory", minAge: 40, maxAge: 45 });
      assert.equal(r.status, 200); const body = await r.json(); assert.ok(body.items.some((c: { id: number }) => c.id === id));
      assert.ok(body.items.every((c: { patientGender: string; category: string }) => c.patientGender === "FEMALE" && c.category === "Respiratory"));
      const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM search_history WHERE user_id=2 ORDER BY id DESC LIMIT 1");
      const historyId = rows[0].id;
      assert.equal((await request(`/api/history/${historyId}`, "DELETE", admin)).status, 404);
      assert.equal((await request(`/api/history/${historyId}`, "DELETE", staff)).status, 200);
      const [remaining] = await pool.query<RowDataPacket[]>("SELECT id FROM search_history WHERE id=?", [historyId]); assert.equal(remaining.length, 0);
    });
    await check("SQL constraints reject invalid age, empty symptoms and plaintext password", async () => {
      await assert.rejects(pool.execute("UPDATE medical_cases SET patient_age=150 WHERE id=?", [id]));
      await assert.rejects(pool.execute("UPDATE medical_cases SET symptoms=' ' WHERE id=?", [id]));
      await assert.rejects(pool.execute("INSERT INTO users(role_id,full_name,email,password_hash) VALUES (2,'Test User','invalid@medmatch.test','plaintext')"));
    });
    await check("MongoDB validator rejects malformed clinical documents", async () => {
      await assert.rejects(mongo.collection("clinical_records").insertOne({ caseId: -1, laboratoryResults: [], examinationDetails: {}, createdAt: new Date() }));
    });
    await check("Views, routine, indexes, aggregates, HAVING, subquery and Mongo aggregation execute", async () => {
      for (const view of ["v_case_summary", "v_diagnosis_statistics", "v_search_statistics"]) await pool.query(`SELECT * FROM ${view} LIMIT 5`);
      const [age] = await pool.query<RowDataPacket[]>("SELECT fn_age_group(42) age_group"); assert.equal(age[0].age_group, "Adult");
      await pool.query("CALL sp_cases_by_diagnosis('Community-acquired pneumonia', 0, 120)");
      const queries = fs.readFileSync("database/mysql/07_important_queries.sql.example", "utf8").split("-- DML examples")[0];
      for (const sql of queries.replace(/^--.*$/gm, "").split(";").filter(s => s.trim())) await pool.query(sql);
      const agg = await mongo.collection("clinical_records").aggregate([{ $project: { entries: { $objectToArray: "$laboratoryResults" } } }, { $unwind: "$entries" }, { $group: { _id: "$entries.k", casesWithField: { $sum: 1 } } }]).toArray();
      assert.ok(agg.length > 0);
      const [indexes] = await pool.query<RowDataPacket[]>("SHOW INDEX FROM medical_cases"); assert.ok(indexes.some(r => r.Index_type === "FULLTEXT"));
    });
    await check("Raw SQL UPDATE fires audit trigger; transaction ROLLBACK restores state", async () => {
      const c = await pool.getConnection();
      try {
        await c.beginTransaction();
        await c.execute("UPDATE medical_cases SET symptoms='Trigger test cough and fever' WHERE id=?", [id]);
        const [rows] = await c.query<RowDataPacket[]>("SELECT id FROM audit_logs WHERE entity_id=? AND action='UPDATE' AND details->'$.updatedAt' IS NOT NULL", [id]); assert.ok(rows.length);
        await c.rollback();
        const [rows2] = await c.query<RowDataPacket[]>("SELECT symptoms FROM medical_cases WHERE id=?", [id]); assert.equal(rows2[0].symptoms, input.symptoms);
      } finally { c.release(); }
    });
    await check("Admin creates/deactivates user; existing session is revoked", async () => {
      const password = crypto.randomBytes(20).toString("hex"); const email = `test-${crypto.randomUUID()}@medmatch.test`;
      const r = await request("/api/admin/users", "POST", admin, { fullName: "Synthetic Test User", email, password, role: "STAFF", isActive: true }); assert.equal(r.status, 201);
      transientUser = (await r.json()).item.id;
      const cookie = await login(email, password);
      assert.equal((await request(`/api/admin/users/${transientUser}`, "PATCH", admin)).status, 200);
      assert.equal((await request("/api/cases", "GET", cookie)).status, 401);
      const protectedPage = await request("/dashboard", "GET", cookie); assert.equal(protectedPage.status, 307);
      assert.equal((await request("/login", "GET", cookie)).status, 200);
      assert.equal((await request("/api/admin/users/1", "PATCH", admin)).status, 400);
    });
    if (process.argv.includes("--outage")) await check("Qdrant outage retains ordered events; replay restores latest data", async () => {
      execFileSync("docker", ["compose", "--env-file", ".env.local", "stop", "qdrant"], { stdio: "ignore" }); qdrantStopped = true;
      for (const wbc of [17, 19]) {
        input.labResults.wbc = wbc;
        const r = await request(`/api/cases/${id}`, "PUT", staff, input); assert.equal(r.status, 200); assert.equal((await r.json()).item.syncPending, true);
      }
      const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM case_sync_outbox WHERE case_id=? AND processed_at IS NULL", [id]); assert.equal(Number(rows[0].n), 2);
      execFileSync("docker", ["compose", "--env-file", ".env.local", "up", "-d", "--wait", "qdrant"], { stdio: "ignore" }); qdrantStopped = false;
      await processCaseSync();
      const [pending] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM case_sync_outbox WHERE case_id=? AND processed_at IS NULL", [id]); assert.equal(Number(pending[0].n), 0);
      assert.equal((await mongo.collection("clinical_records").findOne({ caseId: id }))?.laboratoryResults.wbc, 19);
    });
    await check("Staff cannot delete cases; Admin soft-delete removes clinical/vector projections", async () => {
      assert.equal((await request(`/api/cases/${id}`, "DELETE", staff)).status, 403);
      const r = await request(`/api/cases/${id}`, "DELETE", admin); assert.equal(r.status, 200); assert.equal((await r.json()).item.syncPending, false);
      assert.equal(await mongo.collection("clinical_records").findOne({ caseId: id }), null);
      assert.equal((await getQdrant().retrieve(getCollectionName(), { ids: [id] })).length, 0);
      const [rows] = await pool.query<RowDataPacket[]>("SELECT deleted_at FROM medical_cases WHERE id=?", [id]); assert.ok(rows[0].deleted_at);
      id = 0;
    });
    fs.writeFileSync("docs/integration-results.md", `# Database integration results\n\nRecorded ${new Date().toISOString()}. Actual execution against a local MySQL 8.4, MongoDB 7 and Qdrant stack with the Next.js server in database mode.\n\nCommand: npm run test:integration${process.argv.includes("--outage") ? " -- --outage" : ""}\n\n${results.map(r => `- PASS: ${r}`).join("\n")}\n\nTest cases are synthetic. Case fixtures are soft-deleted and temporary user accounts are deactivated; their audit evidence remains. No existing volumes are reset.\n`);
  } finally {
    if (qdrantStopped) execFileSync("docker", ["compose", "--env-file", ".env.local", "up", "-d", "--wait", "qdrant"], { stdio: "ignore" });
    if (id) await request(`/api/cases/${id}`, "DELETE", admin).catch(() => {});
    if (transientUser) await request(`/api/admin/users/${transientUser}`, "PATCH", admin).catch(() => {});
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Integration failed; check local services and server output."); process.exit(1); });
