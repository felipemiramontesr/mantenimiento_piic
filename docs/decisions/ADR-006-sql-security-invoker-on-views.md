# ADR-006: `SQL SECURITY INVOKER` on Every Database View

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

Incident DB-1045 (root-caused in migration `171_db1045_view_security_invoker.sql`): 4 of the schema's 8 views (`owners`, `user_owner_membership`, `view_fleet_units_tco`, `view_fleet_model_failure_patterns`) had been created with MySQL's default `SQL SECURITY DEFINER`, which pins the view's execution privileges to the _host_ of whoever ran the original `CREATE VIEW` — in this case, a phpMyAdmin session or a GitHub Actions self-hosted runner, neither of which is the production app's connecting host on Hostinger (`127.0.0.1`). MySQL evaluates the DEFINER's host at query time, not at creation time, so the view worked in every environment except the one that mattered: production, where it failed with `Access denied for user 'X'@'127.0.0.1' (1045)`.

This was a repeat of a class of bug FC082 F0 believed it had already closed ("cadena de definers phpMyAdmin-era") — it had not touched `owners`. Worse, `user_owner_membership` (used by `auth.ts`'s `resolveOwnerScope`/`isUserInOwnerScope` and multiple `/users/:id/owners` endpoints) was silently broken in production the whole time; it only ever worked because GrayMan's `permissions: ['*']` always takes a code path that skips that query. The first real Owner/MU actor exercising `fleet:scoped` would have hit the same 500.

## Decision

Every view in the schema is created (or altered) with `SQL SECURITY INVOKER`, not `DEFINER`. Under `INVOKER`, MySQL evaluates the view using the privileges of whichever connection is querying it _right now_ — so it is host-independent by construction. It does not matter which environment or session originally ran the `CREATE VIEW`; the app's production connection can always query it.

This is invariant **I7** of FC094: "`SQL SECURITY INVOKER` en toda VIEW nueva."

## Consequences

- Every new `CREATE VIEW` migration must specify `SQL SECURITY INVOKER` explicitly — MySQL's default is `DEFINER`, so omitting the clause silently reintroduces this exact bug class.
- A DDL gate enforces this mechanically for new migrations (per FC094's invariant table: "gate DDL + ADR 006") rather than relying on migration-review vigilance alone.
- Because DEFINER-based failures only surface for the specific host/privilege combination that hits them, this class of bug can pass every CI check and every non-GrayMan-shortcut-free code review and still reach production silently — any view touching an authorization-relevant query (ownership, scoping) is treated as high-risk until confirmed `INVOKER`.
- Migration `171_db1045_view_security_invoker.sql` is the canonical example of the fix pattern for any view discovered to still be on `DEFINER`.

## References

- `packages/database/migrations/171_db1045_view_security_invoker.sql`
- FC082 F0 (prior, incomplete pass at the same bug class)
- FC094 invariant I7
