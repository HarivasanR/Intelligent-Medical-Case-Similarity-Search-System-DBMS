export interface EmbeddingService {
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}

export class LocalHashEmbeddingService implements EmbeddingService {
  readonly dimensions = 384;
  async embed(text: string) {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const token of tokens) {
      let hash = 2166136261;
      for (const char of token) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
      vector[Math.abs(hash) % this.dimensions] += 1;
      vector[Math.abs(hash >>> 8) % this.dimensions] += 0.5;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}

export interface GeminiEmbeddingOptions {
  apiKey: string;
  model?: string;
  dimensions?: number;
}

/** Server-side Gemini embedding provider. The API key is sent only in a request header. */
export class GeminiEmbeddingService implements EmbeddingService {
  readonly dimensions: number;
  private readonly model: string;

  constructor(private readonly options: GeminiEmbeddingOptions) {
    if (!options.apiKey.trim()) throw new Error("GOOGLE_API_KEY is required to use Gemini embeddings");
    this.model = options.model?.trim() || "gemini-embedding-2";
    this.dimensions = options.dimensions ?? 768;
    if (!Number.isInteger(this.dimensions) || this.dimensions <= 0) {
      throw new Error("Gemini embedding dimensions must be a positive integer");
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.options.apiKey,
        },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: this.dimensions,
        }),
      },
    );
    if (!response.ok) {
      // Google returns a structured error body that distinguishes key restrictions,
      // disabled APIs, invalid models, and quota issues. Surface only its message;
      // never log request headers or the API key.
      const responseBody = await response.text();
      let providerMessage = "";
      try {
        const parsed = JSON.parse(responseBody) as { error?: { message?: string; status?: string } };
        providerMessage = [parsed.error?.status, parsed.error?.message].filter(Boolean).join(": ");
      } catch {
        providerMessage = responseBody.slice(0, 500);
      }
      throw new Error(
        `Gemini embedding request failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`,
      );
    }

    const result = await response.json() as { embedding?: { values?: unknown } };
    const values = result.embedding?.values;
    if (!Array.isArray(values) || values.length !== this.dimensions || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error(`Gemini returned an invalid embedding; expected ${this.dimensions} finite numeric dimensions`);
    }
    return values as number[];
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]; magA += a[i] ** 2; magB += b[i] ** 2;
  }
  return dot / ((Math.sqrt(magA) * Math.sqrt(magB)) || 1);
}

export const embeddingService: EmbeddingService = process.env.GOOGLE_API_KEY
  ? new GeminiEmbeddingService({
      apiKey: process.env.GOOGLE_API_KEY,
      model: process.env.GOOGLE_EMBEDDING_MODEL,
      dimensions: process.env.GOOGLE_EMBEDDING_DIMENSIONS
        ? Number(process.env.GOOGLE_EMBEDDING_DIMENSIONS)
        : 768,
    })
  : new LocalHashEmbeddingService();
