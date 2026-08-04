# ADR-005: `packages/contracts` as a Scoped DTO/Schema SSOT (Not a Full-Backend Rewrite)

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

`apps/api` and `apps/web` independently defined the shape of request/response payloads for shared endpoints, which had already drifted silently at least once (the motivating incident behind FC076: a route's real contract diverged from what the frontend assumed, breaking a form in production). A full-backend contracts rewrite was considered and rejected — FC076 explicitly scoped itself to "Opción B ACOTADA" (Bounded Option B): only the routes whose contracts that FC actually broke and fixed (R1/R4/R5), not a rewrite of every endpoint's DTOs.

## Decision

`packages/contracts/src/index.ts` holds Zod schemas that are the single source of truth for the payload shape of the specific routes it covers (e.g. `userUpdateSchema` for `PATCH /v1/auth/users/:id`). `apps/api` imports the schema directly and uses it 1:1 for its own runtime validation — no semantic changes, no re-derivation. `apps/web` imports the same schema in its own tests, so a form's constructed payload is checked against the real contract the backend enforces, not a hand-maintained copy that can quietly diverge again.

Scope is intentionally bounded to routes that have already needed this guarantee — extending coverage to a new route is a deliberate per-route decision, not an assumed default for every endpoint.

## Consequences

- `packages/contracts` must build cleanly as a workspace dependency of both `apps/api` and `apps/web` under Hostinger's deployment constraints — this was a concrete build-safety risk surfaced during FC082 F0 (invariant **I9** of FC094 exists specifically because of that lesson) and must be re-verified whenever this package's build wiring changes.
- Adding a route to this SSOT is a conscious act: define the Zod schema once in `packages/contracts`, then have both `apps/api` and the relevant `apps/web` tests import it — never redefine the same shape independently in both places for a route already covered here.
- Routes not yet migrated into `packages/contracts` still define their own validation locally; this is accepted debt with an owner (each route's own future domain FC), not a silent inconsistency — FC094's Cond.16/AD1 roadmap (opened in F5) is where each remaining route gets its assigned FC/K entry.

## References

- `packages/contracts/src/index.ts` (FC076 F4)
- FC094 Cond.13/invariant I9 (Hostinger build safety)
- FC094 Cond.16/AD1 (roadmap for remaining routes)
