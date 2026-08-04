# ADR-001: Cosmonaut Chassis as the Single Source of Truth for Roles & Permissions

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

Before FC082, the system carried a legacy role model (numeric role bands, e.g. roles `{1,3,4}`) alongside a newer, more granular "cosmonaut" permission chassis (`apps/api/src/middleware/cosmonautMiddleware.ts`, `requirePermission.ts`, `requireFieldPermission.ts`, `requireOwnership.ts`). Having two live authorization sources created real risk: a check could pass under one model and silently fail — or worse, silently pass — under the other, and reviewers had no single place to reason about "can this actor do X."

FC082 (`F0c` onward) retired the legacy role bands and the tables that backed them (`POST /v1/auth/register`'s old registration path died with roles `{1,3,4}`; the legacy roles CRUD and tables were dropped by migration in FC082 F3c2/F3c3).

## Decision

The **cosmonaut middleware chassis is the sole authorization source** for the API. Every protected route composes its access control from `requirePermission`, `requireFieldPermission`, and `requireOwnership` (BOLA-aware, tenant/owner-scoped), backed by `cosmonautMiddleware.ts`. No route may branch on a second, parallel notion of "role" — legacy role IDs are gone, not just deprecated.

This is invariant **I8** of FC094 ("cero fuentes duales de auth — chasis cosmonauta única SSOT").

## Consequences

- New protected routes must express authorization exclusively through the cosmonaut middleware chain — introducing an ad-hoc `if (user.roleId === X)` check anywhere in route code is an architecture violation, not a style nit.
- BOLA/ownership checks (`requireOwnership`) are mandatory wherever a route resolves a resource scoped to an owner/tenant — this is enforced by dedicated negative tests (`requireOwnership.test.ts`) rather than left to reviewer discretion.
- Onboarding of new roles/permissions happens by extending the cosmonaut permission graph, never by reintroducing a numeric role band.
- GrayMan (`permissions: ['*']`) is the one documented exception with an explicit wildcard, not a second code path — the chassis itself understands the wildcard.

## References

- `apps/api/src/middleware/cosmonautMiddleware.ts`, `requirePermission.ts`, `requireFieldPermission.ts`, `requireOwnership.ts`
- FC082 (legacy role retirement, F0c/F3c2/F3c3)
- FC094 invariant I8
