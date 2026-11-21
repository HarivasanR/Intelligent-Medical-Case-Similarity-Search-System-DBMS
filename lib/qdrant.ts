import { QdrantClient } from "@qdrant/js-client-rest";
import { embeddingService } from "@/services/embedding";

let client: QdrantClient | undefined;
export function getQdrant() {
  if (!process.env.QDRANT_URL) throw new Error("QDRANT_URL is not configured");
  client ??= new QdrantClient({ url: process.env.QDRANT_URL, timeout: 5000, apiKey: process.env.QDRANT_API_KEY || undefined });
  return client;
}

export function getCollectionName() { return process.env.QDRANT_COLLECTION || "medical_cases"; }

export function getConfiguredVectorSize() {
  const configured = process.env.QDRANT_VECTOR_SIZE;
  if (!configured) return embeddingService.dimensions;
  const size = Number(configured);
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("QDRANT_VECTOR_SIZE must be a positive integer");
  }
  assertEmbeddingDimensions(embeddingService.dimensions, size);
  return size;
}

export function assertEmbeddingDimensions(embeddingDimensions: number, qdrantDimensions: number) {
  if (embeddingDimensions !== qdrantDimensions) {
    throw new Error(
      `Embedding dimension mismatch: provider returns ${embeddingDimensions} dimensions but Qdrant is configured for ${qdrantDimensions}. Set matching dimensions and rebuild the Qdrant index.`,
    );
  }
}

function getSingleVectorSize(vectors: unknown): number {
  if (!vectors || typeof vectors !== "object") {
    throw new Error("Qdrant collection does not expose a vector size");
  }
  const config = vectors as { size?: unknown; [name: string]: unknown };
  if (typeof config.size === "number") return config.size;

  const namedVectors = Object.values(config);
  if (namedVectors.length === 1 && namedVectors[0] && typeof namedVectors[0] === "object") {
    const size = (namedVectors[0] as { size?: unknown }).size;
    if (typeof size === "number") return size;
  }
  throw new Error("Qdrant collection must use one unnamed vector configuration for MedMatch search");
}

/** Creates the collection when needed and rejects collections built for another embedder. */
export async function ensureCollection() {
  const qdrant = getQdrant();
  const collectionName = getCollectionName();
  const vectorSize = getConfiguredVectorSize();
  const { exists } = await qdrant.collectionExists(collectionName);
  if (!exists) {
    await qdrant.createCollection(collectionName, { vectors: { size: vectorSize, distance: "Cosine" } });
  } else {
    const collection = await qdrant.getCollection(collectionName);
    const collectionSize = getSingleVectorSize(collection.config.params.vectors);
    assertEmbeddingDimensions(embeddingService.dimensions, collectionSize);
    assertEmbeddingDimensions(vectorSize, collectionSize);
  }
  const info = await qdrant.getCollection(collectionName);
  for (const [field, type] of [["gender", "keyword"], ["category", "keyword"], ["age", "integer"]] as const) {
    if (!info.payload_schema?.[field]) await qdrant.createPayloadIndex(collectionName, { wait: true, field_name: field, field_schema: type });
  }
  return qdrant;
}
