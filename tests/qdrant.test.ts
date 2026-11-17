import { describe, expect, it } from "vitest";
import { assertEmbeddingDimensions } from "@/lib/qdrant";

describe("Qdrant embedding dimensions", () => {
  it("accepts matching provider and collection dimensions", () => {
    expect(() => assertEmbeddingDimensions(768, 768)).not.toThrow();
  });

  it("rejects mismatched dimensions with a re-indexing hint", () => {
    expect(() => assertEmbeddingDimensions(768, 384)).toThrow(/rebuild the Qdrant index/);
  });
});
