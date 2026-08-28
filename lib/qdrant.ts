import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | undefined;
export function getQdrant() {
  if (!process.env.QDRANT_URL) throw new Error("QDRANT_URL is not configured");
  client ??= new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY || undefined });
  return client;
}
