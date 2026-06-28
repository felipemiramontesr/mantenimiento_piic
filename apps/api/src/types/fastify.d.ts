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
      suite?: 'VIM' | 'ERP';
      owner_type?: string;
    };
    universeCtx: UniverseCtx | null;
    scopeFilter: ScopeFilter | null;
  }
}
