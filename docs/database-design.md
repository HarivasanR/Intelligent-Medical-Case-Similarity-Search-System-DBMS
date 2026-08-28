# Database design

## Why three databases

- **MySQL** is the structured system of record. It enforces identities, roles, normalized cases, diagnoses, treatments, search history, and audit relationships.
- **MongoDB** holds clinical structures that vary by case: test panels, examination sections, diagnostic reports, and extra metadata. `caseId` is the cross-database reference; relational data is not duplicated.
- **Qdrant** is a derived search index. It stores one normalized embedding per case plus filterable payload and performs cosine nearest-neighbour search.

## ER diagram

```mermaid
erDiagram
  ROLES ||--o{ USERS : grants
  USERS ||--o{ MEDICAL_CASES : creates
  USERS ||--o{ SEARCH_HISTORY : performs
  USERS ||--o{ AUDIT_LOGS : generates
  MEDICAL_CASES ||--o{ CASE_DIAGNOSES : has
  DIAGNOSES ||--o{ CASE_DIAGNOSES : classifies
  MEDICAL_CASES ||--o{ CASE_TREATMENTS : receives
  TREATMENTS ||--o{ CASE_TREATMENTS : includes
  ROLES { tinyint id PK string name UK }
  USERS { bigint id PK tinyint role_id FK string email UK string password_hash }
  MEDICAL_CASES { bigint id PK string case_code UK int patient_age string patient_gender text symptoms bigint created_by FK }
  DIAGNOSES { bigint id PK string name UK }
  TREATMENTS { bigint id PK string name UK text description }
  CASE_DIAGNOSES { bigint case_id PK,FK bigint diagnosis_id PK,FK boolean is_primary }
  CASE_TREATMENTS { bigint case_id PK,FK bigint treatment_id PK,FK }
  SEARCH_HISTORY { bigint id PK bigint user_id FK text query_text string search_type }
  AUDIT_LOGS { bigint id PK bigint user_id FK string action string entity_type }
```

## MongoDB model

`clinical_records`: `{ caseId, laboratoryResults, observations, examinationDetails, diagnosticReports, additionalMetadata, createdAt }`. Unique `caseId`, lab test, and date indexes are defined. The setup script includes an aggregation that groups abnormal laboratory findings by test.

## Qdrant model

Collection `medical_cases`, 384 dimensions, cosine distance. Searchable text concatenates symptoms, medical history, observations, diagnosis, treatment, and notes. Payload supports diagnosis, age, gender, category, and date filtering.
