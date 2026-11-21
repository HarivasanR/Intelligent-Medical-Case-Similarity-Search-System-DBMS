# Testing

## Commands

- npm run typecheck: TypeScript validation.
- npm run lint: ESLint.
- npm test: validation, similarity and signed-session unit tests.
- npm run build: optimized Next.js build.
- npm run test:integration: actual API/MySQL/MongoDB/Qdrant assertions, with running database-mode server.
- npm run test:integration -- --outage: additionally stops/restarts configured Qdrant to verify durable ordered replay. Local test stack only.
- npm run test:browser: Playwright/Edge checks login, case create/edit/delete, search/history/Admin, mobile details and screenshots.

## Recorded execution

[Integration results](integration-results.md) and [browser results](browser-results.md) record actual runs and are written only after all assertions pass. Fixtures are synthetic, cases soft-deleted and temporary accounts deactivated; audit evidence remains. No volumes are removed.

Database checks cover SQL age/text/hash rejection, MongoDB schema rejection, actual views/routines/FULLTEXT/aggregation, trigger plus rollback, persistence across databases, ownership-scoped history deletion, Staff restrictions, deactivation revocation and outage recovery. Unit tests alone do not establish database integration.

Scripts read credentials from ignored .env.local and never record them in screenshots/reports. Results cover the local environment, not clinical validity, production certification or instructor approval.

Final local checks on 17 November 2026: TypeScript and ESLint passed; 17 unit tests passed; optimized production build passed without the earlier jose Edge warning. The recorded integration run passed 12 grouped checks including a real Qdrant outage/recovery. Browser checks also passed against the optimized production server, and the screenshots are from that production run.
