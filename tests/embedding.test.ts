import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiEmbeddingService, LocalHashEmbeddingService } from "@/services/embedding";

describe("embedding providers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the deterministic local fallback at 384 dimensions", async () => {
    const embedding = await new LocalHashEmbeddingService().embed("cough and fever");
    expect(embedding).toHaveLength(384);
    expect(embedding.every(Number.isFinite)).toBe(true);
  });

  it("requests Gemini embeddings using the configured model and dimensions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ embedding: { values: [0.25, -0.5, 0.75] } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const service = new GeminiEmbeddingService({ apiKey: "test-key", model: "test-embedding-model", dimensions: 3 });

    await expect(service.embed("clinical text")).resolves.toEqual([0.25, -0.5, 0.75]);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/models/test-embedding-model:embedContent");
    expect((request.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(request.body).toContain('"outputDimensionality":3');
    expect(request.body).toContain("clinical text");
  });

  it("rejects a Gemini response whose dimension differs from configuration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ embedding: { values: [0.1, 0.2] } }),
      { status: 200 },
    )));
    const service = new GeminiEmbeddingService({ apiKey: "test-key", dimensions: 3 });
    await expect(service.embed("clinical text")).rejects.toThrow("expected 3 finite numeric dimensions");
  });

  it("does not include response bodies in provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive response", { status: 429 })));
    const service = new GeminiEmbeddingService({ apiKey: "test-key", dimensions: 3 });
    await expect(service.embed("clinical text")).rejects.toThrow("status 429");
  });
});
