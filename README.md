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
- Offline deterministic embedding fallback for no-key demos and a Gemini embedding provider

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

`services/database-cases.ts → createDatabaseCase` writes the case, diagnosis, treatment, audit row, and a `CASE_CREATED` outbox event in **one MySQL transaction**. The API commits without waiting for MongoDB or Qdrant. `services/case-outbox.ts` claims events with `SELECT ... FOR UPDATE SKIP LOCKED` and a two-minute lease, then upserts the MongoDB clinical document and Qdrant vector. MongoDB and Qdrant have separate completion timestamps, so a retry skips a destination that already succeeded. Stable `caseId` keys make both writes idempotent. Failures retry with capped exponential backoff; after 10 attempts an event becomes `DEAD` for operator inspection. Expired worker leases are reclaimable. This is an at-least-once delivery design, not a distributed transaction.

Apply `database/mysql/07_case_outbox.sql` once to existing databases after the earlier schema scripts. New Docker volumes that automatically run the numbered SQL scripts will apply it in order. Run `npm run outbox:process` as a scheduled worker (or repeatedly under a process supervisor); it drains up to `OUTBOX_BATCH_SIZE` events (default 25) and exits. Monitor `case_outbox` rows in `PENDING`, `PROCESSING`, and `DEAD`. To replay a dead event after resolving the cause, set its status to `PENDING`, reset `attempts` to `0`, clear `last_error`/`locked_until`, and set `available_at = NOW()` for that row. The worker requires MySQL 8.0+ for `SKIP LOCKED`.

### Embeddings and environment variables

The app uses the server-side Gemini provider when `GOOGLE_API_KEY` is set; otherwise it preserves the deterministic `LocalHashEmbeddingService` fallback. The API key is read only on the server. Never put it in client-side code or commit a real value.

For the zero-setup demo, set `DATA_MODE=demo` and a long random `AUTH_SECRET`. For database mode, also configure `MYSQL_URL`, `MONGODB_URL`, `MONGODB_DB`, and `QDRANT_URL`; set `QDRANT_API_KEY` if the Qdrant deployment requires it. `QDRANT_COLLECTION` defaults to `medical_cases`.

Gemini settings are `GOOGLE_API_KEY`, `GOOGLE_EMBEDDING_MODEL` (defaults to `gemini-embedding-2`), and `GOOGLE_EMBEDDING_DIMENSIONS` (defaults to 768). Without the key, the local fallback emits 384-dimensional vectors. `QDRANT_VECTOR_SIZE` is optional and defaults to the selected provider's dimension. If explicitly set, it must match the provider. Existing collections are checked at startup/use time and mismatches fail with a message to rebuild the index.

Changing embedding provider, model, or output dimensions changes the vector space. Recreate the configured Qdrant collection and run `npm run seed:vectors` to re-embed every case before using the new provider. Do not mix vectors from different embedding models or dimensions in one collection. Back up any vectors you need before recreating the collection.

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
