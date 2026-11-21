# Evaluation / viva guide

## Preparation

Follow README: setup, Docker startup, migration, seed, then DATA_MODE=database and restart Next.js. Use generated seed passwords from the ignored local file. Confirm all services online and zero pending synchronization events. Run the automated checks and review requirements-checklist.md for human evidence still needed.

## Demonstration

1. Explain the archive-retrieval problem and synthetic-data scope.
2. Present ER diagram, relational mapping and the reason for each database.
3. Login as Staff; browse/filter cases and inspect clinical details.
4. Create/edit a synthetic case, refresh and show its MySQL row, MongoDB caseId and Qdrant point.
5. Search symptoms; explain local hashing, normalization, cosine ranking and filters.
6. Show private history, delete an entry and inspect SQL DELETE/audit effects.
7. Verify Staff is denied Admin access and case deletion.
8. Login as Admin; create/deactivate a test user and show session revocation.
9. Soft-delete a synthetic case and inspect external projection removal.
10. Execute SQL examples, a view, function/procedure, trigger and rollback.
11. Show MongoDB validation/aggregation, test reports and screenshots.
12. Optionally demonstrate Qdrant outage/recovery on the local test stack.
13. Each member explains genuine database and application work with commits.

Four advanced concepts: MySQL transactions, views, stored routines and triggers. Indexes, FULLTEXT and vector similarity provide more. Show database outputs for features without UI buttons. Do not claim cross-database ACID or trained semantic understanding. Screenshots do not replace a live demonstration.
