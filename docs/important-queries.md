# Important queries

The executable examples are in [`database/mysql/07_important_queries.sql`](../database/mysql/07_important_queries.sql). They demonstrate:

- JOIN and aggregate counts for the most common diagnoses
- GROUP BY and HAVING for diagnoses represented by more than three cases
- A correlated subquery comparing each case with its category's average age
- ORDER BY ranking and MySQL FULLTEXT natural-language relevance
- INSERT, UPDATE, and DELETE DML examples
- `v_case_summary`, `v_diagnosis_statistics`, and `v_search_statistics` views
- `fn_age_group` and `sp_cases_by_diagnosis` stored routines
- An AFTER UPDATE trigger that records important case changes
