# Conclusion and future enhancements

MedMatch connects normalized case records, flexible clinical documents and vector retrieval through Next.js. It demonstrates constraints, joins, views, indexes, stored routines, an audit trigger, transactions, MongoDB aggregation and Qdrant similarity. Staff can create/edit cases and manage personal search history; Admin additionally manages users, deletes cases and retries synchronization.

A durable MySQL outbox preserves case mutation intent if external databases are unavailable. Ordered idempotent replay restores projections after recovery. This is eventual consistency, not a distributed ACID transaction.

## Limitations

- Synthetic educational records only; no diagnosis or medical advice.
- Local token hashing has limited synonym/negation understanding.
- Library filtering/pagination loads active cases; large datasets need server pagination.
- Retries occur on writes/searches or Admin/CLI actions. A persistent failing event blocks later events. Production needs supervised retry, alerts and reconciliation.
- Concurrent edits use the last committed write; optimistic versioning is future work.
- Local Docker setup is not a production deployment. Production needs TLS, managed secrets, least-privilege Mongo roles, backups, rate limiting and operational review.
- Team approval, originality and individual contribution evidence remain human responsibilities.

## Future enhancements

1. Evaluate trained embeddings on a labeled synthetic retrieval dataset; rebuild indexes on model changes.
2. Add a supervised outbox worker and periodic reconciliation.
3. Integrate server-side FULLTEXT search and pagination for larger archives.
4. Add structured laboratory forms and richer schema migrations.
5. Add optimistic version checks, accessibility audits and deployment hardening.
