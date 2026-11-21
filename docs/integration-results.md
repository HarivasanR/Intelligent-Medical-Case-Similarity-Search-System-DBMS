# Database integration results

Recorded 2026-11-21T09:04:41.852Z. Actual execution against a local MySQL 8.4, MongoDB 7 and Qdrant stack with the Next.js server in database mode.

Command: npm run test:integration -- --outage

- PASS: Authentication, role restrictions and cross-origin protection
- PASS: Case INSERT persists in MySQL, MongoDB and Qdrant
- PASS: Case UPDATE changes relational, clinical and vector data
- PASS: API validation rejects invalid age and reversed search range
- PASS: Filtered vector search records private history; ownership-scoped SQL DELETE
- PASS: SQL constraints reject invalid age, empty symptoms and plaintext password
- PASS: MongoDB validator rejects malformed clinical documents
- PASS: Views, routine, indexes, aggregates, HAVING, subquery and Mongo aggregation execute
- PASS: Raw SQL UPDATE fires audit trigger; transaction ROLLBACK restores state
- PASS: Admin creates/deactivates user; existing session is revoked
- PASS: Qdrant outage retains ordered events; replay restores latest data
- PASS: Staff cannot delete cases; Admin soft-delete removes clinical/vector projections

Test cases are synthetic. Case fixtures are soft-deleted and temporary user accounts are deactivated; their audit evidence remains. No existing volumes are reset.
