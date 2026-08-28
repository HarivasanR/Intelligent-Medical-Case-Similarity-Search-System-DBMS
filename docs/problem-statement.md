# Problem statement

Clinical case archives are difficult to reuse when related cases describe the same concepts with different wording. MedMatch stores synthetic historical cases and retrieves relevant precedents through keyword, structured, and semantic search. It is an academic reference system, not a diagnostic product.

## Scope

- Anonymous synthetic patient demographics and clinical narratives
- Case CRUD with role-based access
- Keyword, filters, semantic similarity, search history, statistics, and auditability
- MySQL, MongoDB, and Qdrant with distinct responsibilities
- Excludes real patient data, prescriptions, autonomous diagnosis, and production hospital integration
