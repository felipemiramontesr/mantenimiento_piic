import '@fastify/jwt';
import type { UniverseCtx, ScopeFilter } from './scopes';
import type { MailTransport } from '../services/mailTransport';

declare module 'fastify' {
  interface FastifyInstance {
    /** FC187 F1 — transporte de correo del proceso (smtp | memory | disabled); lo consumen F3/F5. */
    mailTransport: MailTransport;
  }

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
