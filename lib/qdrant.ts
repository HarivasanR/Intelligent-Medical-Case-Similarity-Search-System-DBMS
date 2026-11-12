import { QdrantClient } from "@qdrant/js-client-rest";
import { embeddingService } from "@/services/embedding";

let client: QdrantClient | undefined;
export function getQdrant() {
  if (!process.env.QDRANT_URL) throw new Error("QDRANT_URL is not configured");
  client ??= new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY || undefined });
  return client;
}

export function getCollectionName() { return process.env.QDRANT_COLLECTION || "medical_cases"; }

/** Creates the vector collection (384-d, cosine) the first time it is needed. */
export async function ensureCollection() {
  const qdrant = getQdrant();
  const { exists } = await qdrant.collectionExists(getCollectionName());
  if (!exists) await qdrant.createCollection(getCollectionName(), { vectors: { size: embeddingService.dimensions, distance: "Cosine" } });
  return qdrant;
}
