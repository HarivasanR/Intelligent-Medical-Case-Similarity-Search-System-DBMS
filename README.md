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
3. On a **new** MySQL volume, Docker automatically runs every `.sql` script in `database/mysql/` (01 → 06) in order. On an existing volume, run them yourself with your SQL client; `04_triggers.sql` and `05_routines.sql` drop and recreate their objects, so they are safe to re-run.
4. Seed: `npm run seed` (users + 60 cases into MySQL, MongoDB and Qdrant together). `npm run seed:vectors` rebuilds the Qdrant index from whatever is in MySQL, which is useful if Qdrant was reset.
5. Start Next.js: `npm run dev`.

In database mode the case library, case details, search history, and Admin panel all read live data. The Admin panel pings each database and shows its real status.

### How a new case is saved across three databases

`services/database-cases.ts → createDatabaseCase` opens a MySQL transaction, inserts the case, diagnosis, treatment and audit rows, then writes the clinical document to MongoDB and the vector to Qdrant. **MySQL commits only after MongoDB and Qdrant succeed.** If either fails, MySQL rolls back and the MongoDB document is removed, so a case never exists in just one database.

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
