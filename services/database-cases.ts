import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import { ensureCollection, getCollectionName, getQdrant } from "@/lib/qdrant";
import { caseToSearchText } from "@/services/cases";
import { embeddingService } from "@/services/embedding";
import type { MedicalCase } from "@/types";

// Scalar subqueries keep one row per case even when it has multiple diagnoses or treatments.
// Prefer explicitly primary diagnoses; use the most recently linked record as a safe fallback.
export const CASE_SELECT = `
  SELECT mc.id, mc.case_code, mc.patient_age, mc.patient_gender, mc.category, mc.symptoms,
    mc.medical_history, mc.clinical_observations, mc.notes, mc.created_at,
    u.full_name created_by,
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
  return { id: Number(r.id), caseCode: r.case_code, patientAge: r.patient_age, patientGender: r.patient_gender, category: r.category, symptoms: r.symptoms, medicalHistory: r.medical_history || "", clinicalObservations: r.clinical_observations, diagnosis: r.diagnosis || "Pending", treatment: r.treatment || "Not recorded", notes: r.notes || "", createdAt: new Date(r.created_at).toISOString(), createdBy: r.created_by };
}

export async function createDatabaseCase(input: Omit<MedicalCase, "id" | "caseCode" | "createdAt" | "createdBy">, userId: number) {
  const pool = getMySqlPool();
  const connection = await pool.getConnection();
  let caseId = 0;
  let mongoWriteAttempted = false;
  let qdrantClient: Awaited<ReturnType<typeof ensureCollection>> | undefined;
  let qdrantWriteAttempted = false;
  try {
    await connection.beginTransaction();
    const code = `MC-${Date.now().toString().slice(-8)}`;
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO medical_cases (case_code, patient_age, patient_gender, category, symptoms, medical_history, clinical_observations, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, input.patientAge, input.patientGender, input.category, input.symptoms, input.medicalHistory, input.clinicalObservations, input.notes, userId]
    );
    caseId = result.insertId;
    const [diagnosis] = await connection.execute<ResultSetHeader>("INSERT INTO diagnoses (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [input.diagnosis]);
    const [treatment] = await connection.execute<ResultSetHeader>("INSERT INTO treatments (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [input.treatment.slice(0, 250), input.treatment]);
    await connection.execute("INSERT INTO case_diagnoses (case_id, diagnosis_id, is_primary) VALUES (?, ?, TRUE)", [caseId, diagnosis.insertId]);
    await connection.execute("INSERT INTO case_treatments (case_id, treatment_id) VALUES (?, ?)", [caseId, treatment.insertId]);
    await connection.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'CREATE', 'medical_case', ?, JSON_OBJECT('caseCode', ?))", [userId, caseId, code]);

    // Write to MongoDB and Qdrant before committing MySQL. If a later step fails,
    // the catch block rolls back MySQL and attempts compensating deletes in both stores.
    const mongo = await getMongoDb();
    mongoWriteAttempted = true;
    await mongo.collection("clinical_records").insertOne({ caseId, laboratoryResults: input.labResults, examinationDetails: input.examinationDetails, createdAt: new Date() });
    const vector = await embeddingService.embed(caseToSearchText(input));
    qdrantClient = await ensureCollection();
    // Mark the write as attempted before awaiting it: a network error can occur after
    // Qdrant has persisted the point but before the client receives its response.
    qdrantWriteAttempted = true;
    await qdrantClient.upsert(getCollectionName(), { wait: true, points: [{ id: caseId, vector, payload: { caseId, diagnosis: input.diagnosis, age: input.patientAge, gender: input.patientGender, category: input.category } }] });

    await connection.commit();
    return { id: caseId, caseCode: code };
  } catch (error) {
    await connection.rollback().catch((rollbackError) => {
      console.error("Failed to roll back MySQL transaction after case creation failed:", rollbackError);
    });
    // Compensate for writes to external stores. These operations are best-effort:
    // a prolonged outage can still leave an orphan that needs reconciliation.
    if (caseId && qdrantClient && qdrantWriteAttempted) {
      await qdrantClient.delete(getCollectionName(), { points: [caseId], wait: true }).catch((cleanupError) => {
        console.error("Failed to remove Qdrant point after case creation failed:", cleanupError);
      });
    }
    if (caseId && mongoWriteAttempted) {
      await getMongoDb()
        .then((db) => db.collection("clinical_records").deleteOne({ caseId }))
        .catch((cleanupError) => {
          console.error("Failed to remove MongoDB clinical record after case creation failed:", cleanupError);
        });
    }
    throw error;
  } finally { connection.release(); }
}

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
    const term = `%${filters.query.replace(/[\\\\%_]/g, "\\\\export async function listDatabaseCases(): Promise<MedicalCase[]> {")}%`;
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

/** One case = structured row from MySQL + flexible clinical document from MongoDB, joined by case ID. */
export async function getDatabaseCase(id: number): Promise<MedicalCase | null> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`${CASE_SELECT} WHERE mc.id = ? AND mc.deleted_at IS NULL`, [id]);
  if (!rows.length) return null;
  const item = rowToCase(rows[0]);
  try {
    const record = await (await getMongoDb()).collection("clinical_records").findOne({ caseId: id });
    if (record) { item.labResults = record.laboratoryResults; item.examinationDetails = record.examinationDetails; }
  } catch (error) {
    console.error("Failed to load MongoDB clinical record:", error);
  }
  return item;
}

export interface SearchHistoryItem { id: number; query: string; type: string; results: number; date: string; user: string; executionMs?: number }

export async function listDatabaseSearchHistory(limit = 50): Promise<SearchHistoryItem[]> {
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(
    `SELECT sh.id, sh.query_text, sh.search_type, sh.result_count, sh.execution_ms, sh.created_at, u.full_name
     FROM search_history sh JOIN users u ON u.id = sh.user_id
     ORDER BY sh.created_at DESC, sh.id DESC LIMIT ?`, [limit]);
  return rows.map((r) => ({
    id: Number(r.id), query: r.query_text, type: r.search_type.charAt(0) + r.search_type.slice(1).toLowerCase(),
    results: Number(r.result_count), date: new Date(r.created_at).toISOString(), user: r.full_name,
    executionMs: r.execution_ms ?? undefined,
  }));
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
