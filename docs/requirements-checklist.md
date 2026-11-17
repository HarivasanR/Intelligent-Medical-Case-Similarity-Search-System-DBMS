# Requirements checklist

Reference: four-page DBMS Level 3 Project Requirements draft in the repository root. Code presence and actual execution evidence are distinguished.

| PDF item | Evidence / status |
|---|---|
| 1. Title/problem | MedMatch, meaningful archive retrieval beyond CRUD. Section uniqueness requires confirmation. |
| 2. Two-member team, both areas | Human evidence pending; see team-contributions.md. |
| 3. Database paradigms | MySQL + MongoDB + Qdrant; integration results recorded. |
| 4. Design | ER, relational mapping, dictionary, Mongo validator/indexes, embedding/payload/retrieval docs. |
| 5. DDL | 01-06/08: CREATE/ALTER/DROP, keys, constraints, indexes, views. Fresh initialization/migration checked. |
| 6. DML and queries | Case/user INSERT/UPDATE, scoped history DELETE, joined SELECT; aggregate/HAVING/subquery/FULLTEXT examples executed. |
| 7. Four advanced concepts | Transactions, views, routines, trigger, indexes, FULLTEXT and vector search; live results recorded. |
| 8. Optional vector retrieval | 384-dimensional hashing, Qdrant cosine/filters; limitations documented. |
| 9. Next.js UI | Browser tests/screenshots cover forms, tables, search, dashboard, administration. |
| 10. API/configuration | Server routes/services, ignored random local secrets, environment-based Docker settings. |
| 11. Two roles/authentication | Admin/Staff, bcrypt, signed cookies, live access checks and negative tests. |
| 12. Validation/consistency | SQL CHECK/FK/UNIQUE, Mongo validator, durable ordered outbox and outage recovery. |
| 13. Security | Parameterized SQL, bcrypt, random secrets, loopback DB ports, Mongo/Qdrant authentication, Origin rejection, revocation. Public demo accounts intentionally documented. |
| 14. Documentation | Problem/objectives/scope/requirements/design/schema/justification/queries/architecture/screenshots/testing/conclusion/future work. |
| 15. Git/README/contributions | Repository and README maintained; genuine second-member commits still pending. |
| 16. Demonstration | Reproducible guide and actual integration/browser reports; final presentation/member explanations remain human responsibilities. |
| 17. Originality | Cannot certify from code alone; provide genuine design rationale and instructor review. |
| 18. Level 3 scope | Multi-database retrieval, integrity, transactions/outbox and advanced queries exceed basic CRUD. |

Do not mark instructor approval, title uniqueness, originality or a second member's work complete without real evidence. No approval or authorship was fabricated.
