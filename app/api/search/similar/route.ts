import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSession } from "@/lib/auth";
import { getMySqlPool } from "@/lib/mysql";
import { getQdrant } from "@/lib/qdrant";
import { searchSchema } from "@/lib/validation";
import { embeddingService } from "@/services/embedding";
import { findSimilarDemo } from "@/services/cases";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = searchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter at least three characters of clinical information." }, { status: 400 });
  const { query, limit, gender, category, minAge, maxAge } = parsed.data;
  if ((process.env.DATA_MODE || "demo") === "demo") {
    return NextResponse.json({ items: await findSimilarDemo(query, limit, { patientGender: gender, category, minAge, maxAge }), method: "Local deterministic vector + keyword hybrid" });
  }
  const vector = await embeddingService.embed(query);
  const must = [gender && { key: "gender", match: { value: gender } }, category && { key: "category", match: { value: category } }, minAge !== undefined && { key: "age", range: { gte: minAge } }, maxAge !== undefined && { key: "age", range: { lte: maxAge } }].filter(Boolean) as never[];
  const response = await getQdrant().query(process.env.QDRANT_COLLECTION || "medical_cases", { query: vector, limit, filter: must.length ? { must } : undefined, with_payload: true });
  const hits = response.points;
  const ids = hits.map((hit) => Number(hit.id));
  if (!ids.length) return NextResponse.json({ items: [], method: "Qdrant cosine similarity" });
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await getMySqlPool().query<RowDataPacket[]>(`SELECT mc.*, d.name diagnosis, t.description treatment, u.full_name created_by FROM medical_cases mc JOIN users u ON u.id=mc.created_by LEFT JOIN case_diagnoses cd ON cd.case_id=mc.id AND cd.is_primary=TRUE LEFT JOIN diagnoses d ON d.id=cd.diagnosis_id LEFT JOIN case_treatments ct ON ct.case_id=mc.id LEFT JOIN treatments t ON t.id=ct.treatment_id WHERE mc.id IN (${placeholders})`, ids);
  const scoreMap = new Map<number, number>(hits.map((hit) => [Number(hit.id), hit.score]));
  const items = rows.map((r) => ({ id:r.id, caseCode:r.case_code, patientAge:r.patient_age, patientGender:r.patient_gender, category:r.category, symptoms:r.symptoms, medicalHistory:r.medical_history||"", clinicalObservations:r.clinical_observations, diagnosis:r.diagnosis||"Pending", treatment:r.treatment||"Not recorded", notes:r.notes||"", createdAt:new Date(r.created_at).toISOString(), createdBy:r.created_by, score:Number(scoreMap.get(r.id)||0), matchReason:"Qdrant cosine similarity" })).sort((a,b)=>b.score-a.score);
  await getMySqlPool().execute("INSERT INTO search_history (user_id, query_text, search_type, result_count) VALUES (?, ?, 'SEMANTIC', ?)", [user.id, query, items.length]);
  return NextResponse.json({ items, method: "Qdrant cosine similarity" });
}
