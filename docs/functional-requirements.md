# Functional requirements

| ID | Implemented behavior | Access |
|---|---|---|
| FR-01 | Login/logout, signed sessions, live account checks | All |
| FR-02 | Browse, substring/category/gender filtering, pagination, case details | Staff, Admin |
| FR-03 | Create/edit cases and durable clinical/vector synchronization | Staff, Admin |
| FR-04 | Soft-delete cases and remove external projections | Admin |
| FR-05 | Local vector similarity with age/gender/category filters | Staff, Admin |
| FR-06 | Display text similarity scores, not diagnostic confidence | Staff, Admin |
| FR-07 | Read/delete own history with SQL DELETE | Staff, Admin |
| FR-08 | Database-backed dashboard | Staff, Admin |
| FR-09 | Create/deactivate users, health/audit counts, retry synchronization | Admin |
| FR-10 | FULLTEXT, views, routines, trigger, aggregation, constraints | DB evaluation scripts |

Demo mode is labeled: writes do not persist, statistics/history are samples, and service indicators represent sample topology. Use database mode for evaluation. Admin displays audit counts; detailed audit records are inspected through SQL, not a dedicated audit-table UI.
