# Data dictionary

| Table | Important columns | Purpose / constraints |
|---|---|---|
| `roles` | `id` PK, `name` UNIQUE | Admin and Staff authorization roles |
| `users` | `id` PK, `role_id` FK, `email` UNIQUE, `password_hash` | Secure identities; bcrypt hash-format CHECK |
| `medical_cases` | `id` PK, `case_code` UNIQUE, `patient_age`, `patient_gender`, clinical text | Structured case system of record; age CHECK 0–120, soft delete |
| `diagnoses` | `id` PK, `name` UNIQUE | Diagnosis vocabulary |
| `treatments` | `id` PK, `name` UNIQUE, `description` | Treatment vocabulary and plan |
| `case_diagnoses` | composite PK and two FKs, `is_primary` | Many-to-many case classification |
| `case_treatments` | composite PK and two FKs | Many-to-many treatment assignment |
| `search_history` | `user_id` FK, query, type, result count | Search accountability and reporting |
| `audit_logs` | actor, action, entity, JSON details | Change traceability |

MongoDB clinical_records: positive integer caseId, laboratoryResults string/number map, examinationDetails string map, createdAt Date. Shared validator installed at first boot and by db:migrate. Indexes: unique caseId and descending createdAt. Qdrant: MySQL case ID, 384-float normalized token-hash vector, cosine distance, diagnosis/age/gender/category/date payload. UI filters age/gender/category.

case_sync_outbox: id PK, case_id FK, operation UPSERT/DELETE, payload JSON snapshot, attempts, last_error, created_at, processed_at. Index (processed_at,id) supports ordered retry. Events commit with case changes and retain clinical intent while external services are unavailable. Processed entries remain for traceability; retention is future work.
