# ADR-007: One Client-Side Session Client, Guarded by `sessionEpochRef` — No Parallel Refresh Mutex

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

The client silently re-authenticates on mount by calling `POST /v1/auth/refresh` using the httpOnly refresh cookie (ADR-003). That call is asynchronous, and its resolution can race a manual, synchronous state change that happens while it's still in flight — most importantly `logout()`. Without a guard, a slow `/auth/refresh` response arriving _after_ the user has already logged out could resurrect the session (setting `token`/`currentUser`/`isAuthenticated` back to a logged-in state), overwriting a deliberate, more recent action with a stale one.

## Decision

`AuthContext.tsx` owns a single `sessionEpochRef` (`useRef(0)`), incremented on every session-defining action — `login()` and `logout()` both do `sessionEpochRef.current += 1`. The mount-time silent-refresh effect captures `epochAtStart = sessionEpochRef.current` before awaiting `/auth/refresh`, and checks `sessionEpochRef.current !== epochAtStart` immediately after the await resolves (both on success and on the catch path) — if the epoch moved, the in-flight refresh is stale and its result is discarded rather than applied.

This is the **one** session client and the **one** staleness guard. FC094 invariant **I10** forbids introducing a second, parallel refresh mutex or a competing session-freshness mechanism anywhere else in the frontend (e.g., a second context, a per-feature "am I still logged in" poller) — any future feature that needs to react to session changes consumes `AuthContext`, it does not build its own.

## Consequences

- Any new async flow that can outlive a logout/login (not just the initial mount-time refresh) must follow the same epoch-capture-then-compare pattern if it touches session state — copy-pasting `sessionEpochRef`'s logic locally instead of consuming `AuthContext` is the violation invariant I10 exists to prevent, not just style debt.
- FC094 F4 (the centralized HTTP client pilot) must integrate with this existing `sessionEpochRef`, not invent a second one — the ADR exists precisely so that decision doesn't have to be re-litigated per feature.
- The guard is intentionally simple (an integer ref, not a cancellation token or AbortController) — sufficient because the only thing that must never happen is _applying_ a stale result, not preventing the stale request from completing.

## References

- `apps/web/src/context/AuthContext.tsx` (`sessionEpochRef`, `login`, `logout`, mount-time `restoreSession`)
- ADR-003 (JWT access-in-memory / httpOnly refresh — the flow this guard protects)
- FC094 invariant I10
