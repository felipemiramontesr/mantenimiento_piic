import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify(): Promise<void>;
    user: {
      id: number;
      username: string;
      roleId: number;
      roleName: string;
      permissions: string[];
    };
  }
}
