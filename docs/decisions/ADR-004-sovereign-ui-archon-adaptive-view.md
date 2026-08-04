# ADR-004: Sovereign UI — ArchonAdaptiveView as the Canonical List-Rendering Container

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

Every module that lists domain records (fleet units, maintenance orders, users, routes, incidents…) needs the same recurring capability: let the operator choose how to view the data (table, cards, calendar, charts), remember that choice, and default sensibly on first visit — table on desktop, cards on a narrow viewport, since a dense table is hard to use on mobile. Without a shared component, each module would reinvent this switch with its own bugs (e.g., a stored preference for a view the module doesn't actually provide).

## Decision

`apps/web/src/components/Common/ArchonAdaptiveView.tsx` is the single, shared container for this pattern, and every "Sovereign UI" module composes it rather than building its own view-switcher:

- The view domain is closed and finite: `{TABLE, CARDS, CALENDAR, CHARTS}` (`AdaptiveViewKind`). `TABLE` is mandatory for every host module; the others are opt-in.
- Preference persists in `localStorage` under a per-module `storageKey`, so one module's choice never leaks into another's.
- `resolveInitialView` is a pure, independently testable function: a valid stored preference always wins; otherwise mobile viewport defaults to `CARDS` (if the host provides it); otherwise `TABLE`. Any value outside the closed domain — a stale key from a removed view kind, or garbage from a manual `localStorage` edit — falls back to `TABLE` rather than crashing or rendering nothing (the FC071 lesson referenced in the component's own header comment: never trust externally-persisted data without a fallback).

`SovereignLayoutContext`/`SovereignHeader` provide the surrounding chrome (navigation, header) that every module using `ArchonAdaptiveView` sits inside — together these form what the codebase calls "Sovereign UI."

## Consequences

- A new list-rendering module gets view-switching, mobile-aware defaulting, and preference persistence for free by composing `ArchonAdaptiveView` — it must not hand-roll an equivalent switcher.
- Adding a new view kind means extending the closed `AdaptiveViewKind` union and `VIEW_META`/`VIEW_ORDER` in one place — not threading a new ad-hoc prop through every module.
- Because the domain is closed and the fallback is fail-safe, a future migration that retires a view kind (e.g., dropping `CHARTS` from a module) cannot strand a user on a broken stored preference — they silently fall back to `TABLE`.

## References

- `apps/web/src/components/Common/ArchonAdaptiveView.tsx` (FC 041 Fase A)
- `apps/web/src/context/SovereignLayoutContext.tsx`, `components/Navigation/SovereignHeader.tsx`
