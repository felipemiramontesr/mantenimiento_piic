export {};
// @fastify/cookie v9 augmentation for FastifyReply.
// Re-declared here because the root-level @fastify/cookie types file
// cannot resolve 'fastify' from the workspace node_modules path.
declare module 'fastify' {
  interface CookieOpts {
    domain?: string;
    encode?: (val: string) => string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    partitioned?: boolean;
    path?: string;
    sameSite?: 'lax' | 'none' | 'strict' | boolean;
    priority?: 'low' | 'medium' | 'high';
    secure?: boolean | 'auto';
    signed?: boolean;
  }
  interface FastifyReply {
    setCookie(name: string, value: string, options?: CookieOpts): FastifyReply;
    cookie(name: string, value: string, options?: CookieOpts): FastifyReply;
    clearCookie(name: string, options?: CookieOpts): FastifyReply;
  }
}
