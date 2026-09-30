import { describe, it, expect, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import requireSession from './requireSession';

/** FC202 F2 — el hook de sesión único que reemplaza la copia literal de diez plugins. */
describe('requireSession (onRequest)', () => {
  const replyDouble = (): {
    reply: FastifyReply;
    code: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  } => {
    const send = vi.fn();
    const code = vi.fn(() => ({ send }));
    return { reply: { code } as unknown as FastifyReply, code, send };
  };

  it('lets the request through when the JWT verifies', async () => {
    const request = { jwtVerify: vi.fn().mockResolvedValue({}) } as unknown as FastifyRequest;
    const { reply, code } = replyDouble();
    await requireSession(request, reply);
    expect(request.jwtVerify).toHaveBeenCalledTimes(1);
    expect(code).not.toHaveBeenCalled();
  });

  it('answers 401 with the historical body when the JWT is missing or invalid', async () => {
    const request = {
      jwtVerify: vi.fn().mockRejectedValue(new Error('no token')),
    } as unknown as FastifyRequest;
    const { reply, code, send } = replyDouble();
    await requireSession(request, reply);
    expect(code).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ error: 'Archon Protection: Session required' });
  });
});
