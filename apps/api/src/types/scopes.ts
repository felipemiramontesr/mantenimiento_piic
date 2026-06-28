/**
 * Shared scope types — FC-18 FaseC-1 + FaseD-2
 * Centralized here so fastify.d.ts, plugins and middleware share a single source of truth.
 */

export type UniverseCtx = {
  universeId: number;
  tenantId: number;
  ownerId: number | null;
  isOmnipotent: boolean;
};

export type ScopeFilter =
  | { anyScope: true; ownerId?: never }
  | { ownerId: number; anyScope?: never };
