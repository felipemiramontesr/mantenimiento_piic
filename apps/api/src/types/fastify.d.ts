import '@fastify/jwt';
import type { UniverseCtx, ScopeFilter } from './scopes';

declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify(): Promise<void>;
    user: {
      id: number;
      username: string;
      roleId: number;
      roleName: string;
      permissions: string[];
      owner_type?: string | null;
      tenant_id?: number | null;
    };
    universeCtx: UniverseCtx | null;
    scopeFilter: ScopeFilter | null;
  }
}
