# MedMatch - Intelligent Medical Case Similarity & Search System

A DBMS Level 3 application for retrieving related **synthetic** historical medical cases. MySQL is the relational system of record, MongoDB stores flexible clinical documents, and Qdrant provides local vector similarity search. Educational reference only; not medical advice or diagnosis.

## Start on Windows

Prerequisites: Node.js 22/24, npm (or pnpm), and Docker Desktop for database mode. Run commands from this repository directory.

```powershell
npm install
npm run setup
npm run dev
```

Open http://localhost:3000 (or the printed port). Keep the terminal open; Ctrl+C stops it. Setup creates/fills missing `.env.local` values with random secrets, never prints secrets and preserves existing non-placeholder settings. Do not commit that file.

Initial `DATA_MODE=demo` uses 60 cases without databases. Public sample accounts: `admin@medmatch.test` / `Admin@123`, or `staff@medmatch.test` / `Staff@123`. Their passwords are stored as bcrypt hashes. Demo changes validate/preview only and do not persist; sample statistics/history are labeled.

## Full database mode - use for evaluation

Start Docker Desktop, then:

```powershell
npm run setup
npm run db:up
npm run db:migrate
npm run seed
```

Set `DATA_MODE=database` in `.env.local` and restart `npm run dev`. Emails: `admin@medmatch.test` and `staff@medmatch.test`. Passwords: generated `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD` in `.env.local`. Re-seeding does not reset existing account passwords or duplicate seeded case codes.

Docker Compose reads `.env.local` through the npm scripts. MySQL uses port 3306, authenticated MongoDB 27017 and API-key-protected Qdrant 6333/6334, all bound to loopback. MySQL uses an application user; migrations alone use root credentials. Use TLS and managed secrets beyond local development.

On fresh volumes MySQL runs SQL 01-06 then 08. The `.sql.example` query file is intentionally not auto-executed because it contains DML demonstrations. MongoDB installs its validator/indexes at first boot. `db:migrate` installs the new SQL integrity/outbox changes, refreshes the trigger and installs MongoDB validation/indexes. Run it before seeding. SQL DDL is not transactional; back up existing data and resolve invalid legacy records before upgrading.

`COMPOSE_PROJECT_NAME=medmatch` separates this authenticated stack from older `jackfruit_*` volumes. **Existing volumes retain their original credentials**; editing environment variables does not rotate database users. To reuse an old stack, supply its matching credentials and upgrade authentication explicitly. Do not delete volumes to fix credential errors. Stop other services occupying these ports.

Later: `npm run db:up`, then `npm run dev`. Stop databases with `npm run db:stop` (data remains). Production: `npm run build`, then `npm start`. Both modes require AUTH_SECRET; there is no fallback signing key.

## Application workflow

1. Sign in as Admin/Staff and inspect the dashboard.
2. Browse/filter cases and open a case ID.
3. Create/edit a synthetic case; refresh to confirm persistence.
4. Search `persistent cough fever difficulty breathing` and try age/gender/category filters.
5. Open a result, review your personal history and delete an entry.
6. Admin can additionally create/deactivate users, soft-delete cases, inspect health/audit counts and retry pending synchronization.

History deletion performs real ownership-scoped SQL DELETE with an audit entry. Case deletion soft-deletes MySQL and removes external projections. Deactivated accounts lose access even with an existing session cookie.

## Consistency and recovery

A case mutation and clinical payload commit with a durable `case_sync_outbox` event in **one MySQL transaction**. After commit, ordered idempotent replay writes MongoDB/Qdrant. External failure leaves the case saved with visible pending status. Case detail reads the saved clinical snapshot while pending; similarity hydration excludes pending/deleted cases.

This is **eventual consistency**, not a distributed ACID transaction. Partial external writes may exist until replay. A MySQL advisory lock serializes replay across requests/workers. Retries run after writes, before vector searches, from Admin, or explicitly:

```powershell
npm run sync
npm run seed:vectors
```

Sync exits nonzero if events remain. Inspect service health and outbox last_error. A persistent failing event blocks later events to preserve ordering. Fix the service/data problem and retry. Vector rebuild upserts active synchronized cases after an index reset; it does not clear an existing collection. Run sync first.

## Search approach

LocalHashEmbeddingService lowercases alphanumeric tokens, hashes them into 384 weighted dimensions and normalizes them. Database mode uses Qdrant cosine similarity; demo mode combines cosine/token overlap. This is **local feature hashing**, not a trained medical semantic model; synonyms and negation have limited support. Adding an API key does not change the embedder. Scores measure text similarity, not diagnostic probability.

The case library filters loaded records using browser-side substring matching. SQL FULLTEXT is separately implemented/demonstrated by the query script. Vector search filters age/gender/category. Date/diagnosis payload metadata are stored but have no current filter controls.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
# With initialized databases and a running database-mode Next.js server:
npm run test:integration
# Optional: temporarily stops/restarts configured Qdrant for recovery testing:
npm run test:integration -- --outage
npm run test:browser
```

Browser checks use installed Edge on Windows. Elsewhere install Chromium with `npx playwright install chromium`, or set BROWSER_CHANNEL. Integration/browser tests create synthetic fixtures, soft-delete cases and deactivate temporary accounts; audit evidence remains. Use a local test stack. No volumes are reset.

See [requirements checklist](docs/requirements-checklist.md), [viva guide](docs/demo-guide.md), [design](docs/database-design.md), [dictionary](docs/data-dictionary.md), [testing](docs/testing.md), [actual integration results](docs/integration-results.md), [browser results](docs/browser-results.md), and [screenshots](docs/screenshots/README.md). Instructor approval, title uniqueness, originality and both members' actual contributions need human evidence and are not claimed by the repository.

## Project map

app: pages/API routes; components: forms/tables/search; lib: connections/auth/validation/demo; services: case/user operations and synchronization; database: executable DB artifacts; scripts: setup/migration/seed/replay/test; docs: design/submission evidence; tests: unit checks.
