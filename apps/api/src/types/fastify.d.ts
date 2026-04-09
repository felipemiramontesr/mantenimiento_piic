import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify(): Promise<void>;
    user: {
      id: number;
      username: string;
      role_id: number;
    };
  }
}
