# Data dictionary

| Table | Important columns | Purpose / constraints |
|---|---|---|
| `roles` | `id` PK, `name` UNIQUE | Admin and Staff authorization roles |
| `users` | `id` PK, `role_id` FK, `email` UNIQUE, `password_hash` | Secure identities; no plaintext password |
| `medical_cases` | `id` PK, `case_code` UNIQUE, `patient_age`, `patient_gender`, clinical text | Structured case system of record; age CHECK 0–120, soft delete |
| `diagnoses` | `id` PK, `name` UNIQUE | Diagnosis vocabulary |
| `treatments` | `id` PK, `name` UNIQUE, `description` | Treatment vocabulary and plan |
| `case_diagnoses` | composite PK and two FKs, `is_primary` | Many-to-many case classification |
| `case_treatments` | composite PK and two FKs | Many-to-many treatment assignment |
| `search_history` | `user_id` FK, query, type, result count | Search accountability and reporting |
| `audit_logs` | actor, action, entity, JSON details | Change traceability |

MongoDB `clinical_records` uses a unique `caseId` and flexible objects for `laboratoryResults`, `examinationDetails`, `diagnosticReports`, and `additionalMetadata`. Qdrant points use the MySQL case ID, a 384-float vector, cosine distance, and filter payload (`diagnosis`, `age`, `gender`, `category`, `date`).
