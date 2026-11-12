import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSession } from "@/lib/auth";
import { getMySqlPool } from "@/lib/mysql";
import { getCollectionName, getQdrant } from "@/lib/qdrant";
import { isDemoMode } from "@/lib/utils";
import { searchSchema } from "@/lib/validation";
import { embeddingService } from "@/services/embedding";
import { findSimilarDemo } from "@/services/cases";
import { CASE_SELECT, rowToCase } from "@/services/database-cases";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = searchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter at least three characters of clinical information." }, { status: 400 });
  const { query, limit, gender, category, minAge, maxAge } = parsed.data;
  if (isDemoMode()) {
    return NextResponse.json({ items: await findSimilarDemo(query, limit, { patientGender: gender, category, minAge, maxAge }), method: "Local deterministic vector + keyword hybrid" });
  }

  try {
    const startedAt = Date.now();
    // 1. Qdrant: embed the query and find the nearest case vectors, applying structured filters on the payload.
    const vector = await embeddingService.embed(query);
    const must = [gender && { key: "gender", match: { value: gender } }, category && { key: "category", match: { value: category } }, minAge !== undefined && { key: "age", range: { gte: minAge } }, maxAge !== undefined && { key: "age", range: { lte: maxAge } }].filter(Boolean) as never[];
    const response = await getQdrant().query(getCollectionName(), { query: vector, limit, filter: must.length ? { must } : undefined, with_payload: true });
    const scoreMap = new Map<number, number>(response.points.map((hit) => [Number(hit.id), hit.score]));

    // 2. MySQL: load the full case rows for the matched IDs.
    let items: ReturnType<typeof rowToCase>[] = [];
    if (scoreMap.size) {
      const ids = [...scoreMap.keys()];
      const [rows] = await getMySqlPool().query<RowDataPacket[]>(`${CASE_SELECT} WHERE mc.id IN (${ids.map(() => "?").join(",")}) AND mc.deleted_at IS NULL`, ids);
      items = rows.map(rowToCase);
    }
    const results = items.map((item) => ({ ...item, score: scoreMap.get(item.id) ?? 0, matchReason: "Qdrant cosine similarity" })).sort((a, b) => b.score - a.score);

    // 3. MySQL: record the search for the history page and v_search_statistics view.
    const filters = { gender, category, minAge, maxAge };
    await getMySqlPool().execute(
      "INSERT INTO search_history (user_id, query_text, search_type, filters_json, result_count, execution_ms) VALUES (?, ?, 'SEMANTIC', ?, ?, ?)",
      [user.id, query, JSON.stringify(filters), results.length, Date.now() - startedAt]
    );
    return NextResponse.json({ items: results, method: "Qdrant cosine similarity" });
  } catch (error) {
    console.error("Similarity search failed:", error);
    return NextResponse.json({ error: "Search failed. Check that MySQL and Qdrant are running and the vectors are seeded." }, { status: 500 });
  }
}
