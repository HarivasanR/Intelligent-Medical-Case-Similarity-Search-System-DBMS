import { randomUUID, createHash } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import { getQdrant } from "@/lib/qdrant";
import { processCaseSync, type SyncCase } from "@/services/case-sync";
import type { MedicalCase } from "@/types";

export const CASE_SELECT = `
  SELECT mc.id, mc.case_code, mc.patient_age, mc.patient_gender, mc.category, mc.symptoms,
    mc.medical_history, mc.clinical_observations, mc.notes, mc.created_at,
    u.full_name created_by,
    EXISTS(SELECT 1 FROM case_sync_outbox o WHERE o.case_id=mc.id AND o.processed_at IS NULL) sync_pending,
    (SELECT d.name
       FROM case_diagnoses cd
       JOIN diagnoses d ON d.id = cd.diagnosis_id
      WHERE cd.case_id = mc.id
      ORDER BY cd.is_primary DESC, cd.diagnosed_at DESC, cd.diagnosis_id DESC
      LIMIT 1) AS diagnosis,
    (SELECT t.description
       FROM case_treatments ct
       JOIN treatments t ON t.id = ct.treatment_id
      WHERE ct.case_id = mc.id
      ORDER BY ct.started_at DESC, ct.treatment_id DESC
      LIMIT 1) AS treatment
  FROM medical_cases mc
  JOIN users u ON u.id = mc.created_by`;

export function rowToCase(r: RowDataPacket): MedicalCase {
  return { id: Number(r.id), caseCode: r.case_code, patientAge: r.patient_age, patientGender: r.patient_gender, category: r.category, symptoms: r.symptoms, medicalHistory: r.medical_history || "", clinicalObservations: r.clinical_observations, diagnosis: r.diagnosis || "Pending", treatment: r.treatment || "Not recorded", notes: r.notes || "", createdAt: new Date(r.created_at).toISOString(), createdBy: r.created_by, syncPending: Boolean(r.sync_pending) };
}

type CaseInput = Omit<MedicalCase, "id" | "caseCode" | "createdAt" | "createdBy" | "syncPending">;
async function saveRelationships(connection: PoolConnection, caseId: number, input: CaseInput) {
  const [diagnosis] = await connection.execute<ResultSetHeader>("INSERT INTO diagnoses (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [input.diagnosis]);
  // Use a content-derived key so long treatment texts sharing a prefix don't overwrite each other.
  const name = createHash("sha256").update(input.treatment).digest("hex");
  const [treatment] = await connection.execute<ResultSetHeader>("INSERT INTO treatments (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [name, input.treatment]);
  await connection.execute("DELETE FROM case_diagnoses WHERE case_id=?", [caseId]);
  await connection.execute("DELETE FROM case_treatments WHERE case_id=?", [caseId]);
  await connection.execute("INSERT INTO case_diagnoses (case_id, diagnosis_id, is_primary) VALUES (?, ?, TRUE)", [caseId, diagnosis.insertId]);
  await connection.execute("INSERT INTO case_treatments (case_id, treatment_id) VALUES (?, ?)", [caseId, treatment.insertId]);
}

// MySQL + durable outbox commit atomically. MongoDB/Qdrant are retryable projections, not a distributed transaction.
async function saveCase(input: CaseInput | null, userId: number, id?: number, seedCode?: string) {
  const creating = id === undefined;
  const connection = await getMySqlPool().getConnection();
  let item: SyncCase;
  try {
    await connection.beginTransaction();
    let code = seedCode ?? `MC-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    let createdAt = new Date().toISOString();
    if (id) {
      const [rows] = await connection.query<RowDataPacket[]>("SELECT case_code, created_at FROM medical_cases WHERE id=? AND deleted_at IS NULL FOR UPDATE", [id]);
      if (!rows.length) throw new Error("Case not found.");
      code = rows[0].case_code; createdAt = new Date(rows[0].created_at).toISOString();
      // App audit records the actual editor; suppress duplicate trigger entries. Reset in finally for pooled connections.
      await connection.execute("SET @medmatch_actor = ?", [userId]);
      if (input) await connection.execute(`UPDATE medical_cases SET patient_age=?, patient_gender=?, category=?, symptoms=?, medical_history=?, clinical_observations=?, notes=? WHERE id=?`, [input.patientAge, input.patientGender, input.category, input.symptoms, input.medicalHistory, input.clinicalObservations, input.notes, id]);
      else await connection.execute("UPDATE medical_cases SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
    } else {
      if (!input) throw new Error("Case data required.");
      const [result] = await connection.execute<ResultSetHeader>(`INSERT INTO medical_cases (case_code, patient_age, patient_gender, category, symptoms, medical_history, clinical_observations, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [code, input.patientAge, input.patientGender, input.category, input.symptoms, input.medicalHistory, input.clinicalObservations, input.notes, userId]);
      id = result.insertId;
    }
    if (input) await saveRelationships(connection, id, input);
    item = { ...(input ?? {} as CaseInput), id, caseCode: code, createdAt };
    await connection.execute("INSERT INTO case_sync_outbox (case_id, operation, payload) VALUES (?, ?, ?)", [id, input ? "UPSERT" : "DELETE", JSON.stringify(item)]);
    await connection.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, 'medical_case', ?, JSON_OBJECT('caseCode', ?))", [userId, !input ? "DELETE" : creating ? "CREATE" : "UPDATE", id, code]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { await connection.query("SET @medmatch_actor = NULL"); connection.release(); }
  await processCaseSync().catch(() => {}); // Never report a committed case as unsaved.
  const [pending] = await getMySqlPool().query<RowDataPacket[]>("SELECT COUNT(*) n FROM case_sync_outbox WHERE case_id=? AND processed_at IS NULL", [item.id]);
  return { id: item.id, caseCode: item.caseCode, syncPending: Number(pending[0].n) > 0 };
}
export async function createDatabaseCase(input: CaseInput, userId: number, seedCode?: string) { return saveCase(input, userId, undefined, seedCode); }
export async function updateDatabaseCase(id: number, input: CaseInput, userId: number) { return saveCase(input, userId, id); }
export async function deleteDatabaseCase(id: number, userId: number) { return saveCase(null, userId, id); }

export interface CaseListFilters {
  page: number;
  pageSize: number;
  query?: string;
  category?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface PaginatedCases {
  items: MedicalCase[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
}

/** Build parameterized filters shared by the count and data queries. */
export function buildCaseListWhere(filters: Pick<CaseListFilters, "query" | "category" | "gender">) {
  const conditions = ["mc.deleted_at IS NULL"];
  const values: (string)[] = [];
  if (filters.query) {
    const term = `%${filters.query}%`;
    conditions.push("(mc.case_code LIKE ? OR mc.symptoms LIKE ? OR EXISTS (SELECT 1 FROM case_diagnoses fcd JOIN diagnoses fd ON fd.id = fcd.diagnosis_id WHERE fcd.case_id = mc.id AND fd.name LIKE ?))");
    values.push(term, term, term);
  }
  if (filters.category) {
    conditions.push("mc.category = ?");
    values.push(filters.category);
  }
  if (filters.gender) {
    conditions.push("mc.patient_gender = ?");
    values.push(filters.gender);
  }
  return { where: conditions.join(" AND "), values };
}

/** Fetch only the requested page; count and rows use identical filters. */
export async function listDatabaseCasesPage(filters: CaseListFilters): Promise<PaginatedCases> {
  const pool = getMySqlPool();
  const { where, values } = buildCaseListWhere(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const [[countRows], [rows], [categoryRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM medical_cases mc WHERE ${where}`, values),
    pool.query<RowDataPacket[]>(
      `${CASE_SELECT} WHERE ${where} ORDER BY mc.created_at DESC, mc.id DESC LIMIT ? OFFSET ?`,
      [...values, filters.pageSize, offset]
    ),
    pool.query<RowDataPacket[]>("SELECT DISTINCT category FROM medical_cases WHERE deleted_at IS NULL ORDER BY category"),
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  return {
    items: rows.map(rowToCase),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(total / filters.pageSize),
    categories: categoryRows.map((row) => String(row.category)),
  };
}

export async function listDatabaseCases(): Promise<MedicalCase[]> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`${CASE_SELECT} WHERE mc.deleted_at IS NULL ORDER BY mc.created_at DESC, mc.id DESC`);
  return rows.map(rowToCase);
}
export async function getDatabaseCase(id: number): Promise<MedicalCase | null> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`${CASE_SELECT} WHERE mc.id=? AND mc.deleted_at IS NULL`, [id]);
  if (!rows.length) return null;
  const item = rowToCase(rows[0]);
  if (item.syncPending) {
    const [events] = await getMySqlPool().query<RowDataPacket[]>("SELECT payload FROM case_sync_outbox WHERE case_id=? ORDER BY id DESC LIMIT 1", [id]);
    const payload = typeof events[0].payload === "string" ? JSON.parse(events[0].payload) : events[0].payload;
    item.labResults = payload.labResults; item.examinationDetails = payload.examinationDetails;
  } else {
    const record = await (await getMongoDb()).collection("clinical_records").findOne({ caseId: id });
    if (record) { item.labResults = record.laboratoryResults; item.examinationDetails = record.examinationDetails; }
  }
  return item;
}
export interface SearchHistoryItem { id: number; query: string; type: string; results: number; date: string; user: string; executionMs?: number }
export async function listDatabaseSearchHistory(userId: number, limit = 50): Promise<SearchHistoryItem[]> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`SELECT sh.*, u.full_name FROM search_history sh JOIN users u ON u.id=sh.user_id WHERE sh.user_id=? ORDER BY sh.created_at DESC, sh.id DESC LIMIT ?`, [userId, limit]);
  return rows.map(r => ({ id: Number(r.id), query: r.query_text, type: r.search_type, results: Number(r.result_count), date: new Date(r.created_at).toISOString(), user: r.full_name, executionMs: r.execution_ms ?? undefined }));
}
export async function deleteSearchHistory(id: number, userId: number) {
  const connection = await getMySqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>("DELETE FROM search_history WHERE id=? AND user_id=?", [id, userId]);
    if (result.affectedRows) await connection.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'DELETE', 'search_history', ?)", [userId, id]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export interface DatabaseDashboardStats {
  cases: MedicalCase[];
  totalCases: number;
  casesThisMonth: number;
  totalSearches: number;
  searchesToday: number;
  clinicalDocuments: number;
  activeUsers: number;
  activeRoles: number;
}

export async function getDatabaseDashboardStats(): Promise<DatabaseDashboardStats> {
  const cases = await listDatabaseCases();

  const now = new Date();
  const casesThisMonth = cases.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  let totalSearches = 0;
  let searchesToday = 0;
  try {
    const [rows] = await getMySqlPool().query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS total_searches,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS searches_today
      FROM search_history
    `);
    if (rows.length > 0) {
      totalSearches = Number(rows[0].total_searches || 0);
      searchesToday = Number(rows[0].searches_today || 0);
    }
  } catch (error) {
    console.error("Failed to fetch search history stats:", error);
  }

  let clinicalDocuments = cases.length;
  try {
    const mongo = await getMongoDb();
    clinicalDocuments = await mongo.collection("clinical_records").countDocuments();
  } catch (error) {
    console.error("Failed to count MongoDB clinical records:", error);
    clinicalDocuments = cases.length;
  }

  let activeUsers = 0;
  let activeRoles = 0;
  try {
    const [rows] = await getMySqlPool().query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS active_users,
        COUNT(DISTINCT role_id) AS active_roles
      FROM users
      WHERE is_active = TRUE
    `);
    if (rows.length > 0) {
      activeUsers = Number(rows[0].active_users || 0);
      activeRoles = Number(rows[0].active_roles || 0);
    }
  } catch (error) {
    console.error("Failed to fetch users stats:", error);
  }

  return {
    cases,
    totalCases: cases.length,
    casesThisMonth,
    totalSearches,
    searchesToday,
    clinicalDocuments,
    activeUsers,
    activeRoles,
  };
}

export interface ServiceHealth { name: string; description: string; online: boolean }

/** Pings each database so the Admin page shows real status instead of a hard-coded "3 / 3". */
export async function checkDatabaseHealth(): Promise<{ services: ServiceHealth[]; auditEvents: number | null }> {
  const ping = async (fn: () => Promise<unknown>) => { try { await fn(); return true; } catch { return false; } };
  const [mysqlOk, mongoOk, qdrantOk] = await Promise.all([
    ping(() => getMySqlPool().query("SELECT 1")),
    ping(async () => (await getMongoDb()).command({ ping: 1 })),
    ping(() => getQdrant().getCollections()),
  ]);
  let auditEvents: number | null = null;
  if (mysqlOk) {
    const [rows] = await getMySqlPool().query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM audit_logs");
    auditEvents = Number(rows[0].total);
  }
  return {
    auditEvents,
    services: [
      { name: "MySQL", description: "Structured system of record", online: mysqlOk },
      { name: "MongoDB", description: "Flexible clinical documents", online: mongoOk },
      { name: "Qdrant", description: "384-d cosine vector index", online: qdrantOk },
    ],
  };
}
