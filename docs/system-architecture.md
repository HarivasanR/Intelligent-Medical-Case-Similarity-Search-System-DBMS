# System architecture

```mermaid
flowchart TD
  U[User] --> UI[Next.js + TypeScript + Tailwind]
  UI --> API[Route Handlers + Zod + session authorization]
  API --> SQL[(MySQL 8)]
  API --> DOC[(MongoDB)]
  API --> EMB[Embedding service abstraction]
  EMB --> VEC[(Qdrant)]
```

## Similarity flow

```mermaid
sequenceDiagram
  User->>Next.js: Natural-language clinical query + filters
  Next.js->>Embedding: Generate normalized vector
  Embedding->>Qdrant: Cosine nearest-neighbour search
  Qdrant-->>Next.js: Ranked case IDs and scores
  Next.js->>MySQL: Hydrate structured case data
  Next.js->>MongoDB: Load flexible clinical records as needed
  Next.js-->>User: Ranked, explainable reference results
```

The default local embedder uses deterministic feature hashing for offline development. The `EmbeddingService` interface can be replaced by an API-backed provider without changing search orchestration.
