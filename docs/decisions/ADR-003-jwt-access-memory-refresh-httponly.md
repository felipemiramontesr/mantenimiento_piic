# ADR-003: JWT Access Token in Memory, Refresh Token in an httpOnly Cookie

## Status

Accepted (already implemented — this ADR documents an existing decision, per FC094 F2 scope).

## Context

The API needs a session model resilient to XSS (a token an injected script can read and exfiltrate is a standing liability) while still supporting silent re-authentication across page reloads without forcing the user to re-enter credentials.

## Decision

`apps/api/src/routes/auth.ts` issues two distinct tokens on login (`POST /v1/auth/login`) and on refresh (`POST /v1/auth/refresh`):

- **Access token**: a short-lived JWT (`fastify.jwt.sign(...)`), returned in the JSON response body. The client (`AuthContext.tsx`) holds it in memory only — never in `localStorage`/`sessionStorage`, never as a non-httpOnly cookie.
- **Refresh token**: a JWT set via `reply.setCookie('refresh_token', refreshToken, refreshCookieOpts)` — `httpOnly`, so client-side JavaScript (and therefore an XSS payload) cannot read it at all. The browser sends it automatically on `POST /v1/auth/refresh`.

On app mount, `AuthContext.tsx` calls `/auth/refresh` to silently obtain a fresh access token from the httpOnly cookie, avoiding a forced re-login on every page reload while keeping the long-lived credential out of script-accessible storage.

## Consequences

- An XSS vulnerability elsewhere in the frontend cannot exfiltrate the refresh token (httpOnly), limiting blast radius to whatever the short-lived access token in memory can do before it expires.
- The access token does not survive a hard page reload by design — the app always re-derives it via `/auth/refresh` on mount, which is the reason the `sessionEpochRef` guard exists (see ADR-007): a stale in-flight refresh must not overwrite a state change (e.g., logout) that happened while it was pending.
- Any new client surface (mobile app, third-party integration) consuming this API must follow the same split — an access token cached in persistent client storage is an architecture violation, not an implementation detail left to the integrator.
- `refreshCookieOpts` (secure/sameSite/path flags) is the single place that governs refresh-cookie exposure; changing session security posture means auditing that one config object, not hunting for scattered cookie-setting calls.

## References

- `apps/api/src/routes/auth.ts` (`login`, `refresh` handlers)
- `apps/web/src/context/AuthContext.tsx`
- ADR-007 (sessionEpochRef — stale-refresh guard)
