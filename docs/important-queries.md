# Important queries

Examples: [07_important_queries.sql.example](../database/mysql/07_important_queries.sql.example). The suffix prevents accidental DML execution during Docker initialization. Review DML before execution; integration tests execute only the read-query section.

The script demonstrates JOIN, GROUP BY, HAVING, aggregates, ORDER BY, correlated subqueries and FULLTEXT. Application workflows INSERT/UPDATE in transactions. Personal history deletion executes DELETE scoped to the current user and adds an audit entry. Case deletion soft-deletes MySQL and enqueues external projection removal.

```sql
SELECT * FROM v_case_summary LIMIT 5;
SELECT * FROM v_diagnosis_statistics;
SELECT * FROM v_search_statistics;
SELECT fn_age_group(42);
CALL sp_cases_by_diagnosis('Community-acquired pneumonia', 0, 120);
SELECT id, case_id, operation, attempts, last_error FROM case_sync_outbox WHERE processed_at IS NULL;
```

For the trigger demonstration, begin a transaction, directly UPDATE symptoms, inspect the audit row, then ROLLBACK. Integration tests exercise this. MongoDB aggregation groups actual laboratory-map field keys. The browser keyword filter does not call SQL FULLTEXT; demonstrate that query separately. Views/routines/triggers need not all have UI buttons, but show actual database output in the viva.
