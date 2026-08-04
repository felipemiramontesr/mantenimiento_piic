# ADR-002: Raw Parametrized SQL via mysql2, No ORM

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

The backend talks to MySQL exclusively through `mysql2` with parametrized queries — there is no Prisma/TypeORM/Sequelize/Knex layer anywhere in `apps/api`. FC094's own scope explicitly states the architecture-adoption effort "does not introduce an ORM" (Cond.11, "0 ORM · 0 big-bang · 0 dual-auth"), confirming this as a standing, deliberate constraint rather than an oversight to fix later.

The domain has non-trivial, MySQL-specific requirements (view-based aggregation with `SQL SECURITY INVOKER`, see ADR-006; JSON columns; encrypted-at-rest fields; recursive/hierarchical fleet queries) that are easier to reason about and audit as explicit SQL than through a query-builder abstraction layer.

## Decision

All database access goes through raw, parametrized SQL strings executed via `mysql2`. This is mechanically enforced, not just documented: `scripts/checkNoRawSql.ts` is a CI-blocking gate (OWASP A03 evidence in `deploy.yml::global-certification`) that fails the build on any non-parametrized query construction (string concatenation into SQL).

Under the Route→Service→Repository pattern this FC introduces (FC094 F3+), SQL execution is further constrained to the Repository layer only (invariant **I3**) — Services and Routes must never issue a query directly (invariants **I1**/**I2**).

## Consequences

- No query builder/ORM dependency to audit for supply-chain risk or to keep in sync with schema migrations.
- Schema changes are plain `.sql` migration files in `packages/database/migrations/` — the migration file _is_ the schema documentation, there is no separate ORM schema/model file that can drift from it.
- Every new domain FC that migrates a route to the Route→Service→Repository pattern must place its SQL exclusively in a `*.repository.ts` file — this is where the new `max-lines-per-function` Gate 1 rule for `**/*.repository.ts` (FC094 F1) applies blanket, since the pattern has zero legacy instances to break.
- Query correctness and injection safety are the developer's/reviewer's direct responsibility, backstopped by `checkNoRawSql.ts` — there is no ORM layer providing automatic parametrization as a safety net.

## References

- `scripts/checkNoRawSql.ts` (OWASP A03 gate, `deploy.yml::global-certification`)
- `packages/database/migrations/`
- FC094 Cond.11, invariants I1-I3
