import { demoCases } from "@/lib/demo-data";
import { cosineSimilarity, embeddingService } from "@/services/embedding";
import type { MedicalCase, SimilarityResult } from "@/types";

export function caseToSearchText(item: MedicalCase) {
  return [item.symptoms, item.medicalHistory, item.clinicalObservations, item.diagnosis, item.treatment, item.notes].join(" ");
}

export async function findSimilarDemo(query: string, limit = 8, filters: Partial<Pick<MedicalCase, "patientGender" | "category">> & { minAge?: number; maxAge?: number } = {}) {
  const queryVector = await embeddingService.embed(query);
  const results: SimilarityResult[] = [];
  for (const item of demoCases) {
    if (filters.patientGender && item.patientGender !== filters.patientGender) continue;
    if (filters.category && item.category !== filters.category) continue;
    if (filters.minAge !== undefined && item.patientAge < filters.minAge) continue;
    if (filters.maxAge !== undefined && item.patientAge > filters.maxAge) continue;
    const vector = await embeddingService.embed(caseToSearchText(item));
    const semantic = cosineSimilarity(queryVector, vector);
    const queryTokens = new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const contentTokens = new Set(caseToSearchText(item).toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const overlap = [...queryTokens].filter((token) => contentTokens.has(token)).length / Math.max(queryTokens.size, 1);
    const score = Math.min(0.99, semantic * 0.75 + overlap * 0.25);
    results.push({ ...item, score, matchReason: overlap > 0.25 ? "Strong symptom and semantic overlap" : "Related clinical context" });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
