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

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]; magA += a[i] ** 2; magB += b[i] ** 2;
  }
  return dot / ((Math.sqrt(magA) * Math.sqrt(magB)) || 1);
}

export const embeddingService: EmbeddingService = new LocalHashEmbeddingService();
