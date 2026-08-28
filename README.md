# MedMatch — Intelligent Medical Case Similarity & Search System

MedMatch is a polished DBMS Level 3 academic project for finding similar **synthetic** historical medical cases. It is deliberately more than a CRUD app: MySQL stores normalized structured data, MongoDB stores variable clinical documents, and Qdrant retrieves semantic neighbours using cosine similarity.

> **Safety:** this is an educational reference system. It does not diagnose patients, provide medical advice, or use real patient information.

## Features

- Secure cookie-based authentication with Admin and Staff roles
- Dashboard with case, search, category, and service-health views
- Paginated case library with keyword, gender, and category filters
- Validated case creation workflow spanning MySQL, MongoDB, and Qdrant
- Similar-case search with natural-language query, age/gender/category filters, similarity scores, and explainable match reasons
- Search history and Admin-only user/service/audit overview
- MySQL DDL, DML, constraints, indexes, FULLTEXT, views, trigger, stored function, stored procedure, transactions, and query examples
- MongoDB indexes and aggregation example
- Offline deterministic embedding fallback for no-key demos; pluggable embedding abstraction for API providers

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Next.js Route Handlers · Zod · MySQL 8 · MongoDB 7 · Qdrant · Vitest.

## Quick start (zero setup demo)

```bash
npm install
copy .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo accounts:

- Admin: `admin@medmatch.test` / `Admin@123`
- Staff: `staff@medmatch.test` / `Staff@123`

Demo mode is selected by `DATA_MODE=demo`; it uses 60 realistic synthetic cases and a deterministic local embedding so the complete UI works immediately.

## Full database mode

1. Start services: `docker compose up -d`.
2. Copy `.env.example` to `.env.local` and set `DATA_MODE=database`.
3. Run the MySQL scripts in `database/mysql/` in numeric order (the compose mount automatically runs `01_schema.sql` only on a new volume; run the remaining scripts manually or with your SQL client).
4. Seed: `npm run seed` and `npm run seed:vectors`.
5. Start Next.js: `npm run dev`.

If `OPENAI_API_KEY` is absent, the local embedder remains available. To use an API provider, implement the same `EmbeddingService` interface in `services/embedding.ts`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

See [`docs/testing.md`](docs/testing.md) for the viva smoke checklist and [`docs/database-design.md`](docs/database-design.md) for the ER diagram and multi-database justification.

## Project map

`app/` UI and route handlers · `components/` reusable interface · `lib/` auth, validation, connections, demo data · `services/` embeddings and database orchestration · `database/` executable SQL/Mongo/Qdrant artifacts · `scripts/` seeders · `docs/` submission documentation · `tests/` automated checks.
