import { describe, it, expect } from 'vitest';
import { MemoryMailTransport, disabledMailTransport } from './mailTransport';
import type { MailMessage } from './mailTransport';

/** FC187 F1 — transportes sin red: memoria (tests, R10) y deshabilitado (sin SMTP usable). */

const MESSAGE: MailMessage = {
  to: 'destino@example.test',
  subject: 'Asunto',
  html: '<p>hola</p>',
  text: 'hola',
};

describe('FC187 F1 — MemoryMailTransport', () => {
  it('guarda el mensaje en la cola y responde sent con un id incremental', async () => {
    const transport = new MemoryMailTransport();

    const first = await transport.send(MESSAGE);
    const second = await transport.send({ ...MESSAGE, to: 'otro@example.test' });

    expect(first).toEqual({ status: 'sent', messageId: 'memory-1' });
    expect(second).toEqual({ status: 'sent', messageId: 'memory-2' });
    expect(transport.outbox).toHaveLength(2);
    expect(transport.outbox[1].to).toBe('otro@example.test');
  });

  it('reset() vacía la cola y reinicia la numeración', async () => {
    const transport = new MemoryMailTransport();
    await transport.send(MESSAGE);

    transport.reset();

    expect(transport.outbox).toHaveLength(0);
    expect(await transport.send(MESSAGE)).toEqual({ status: 'sent', messageId: 'memory-1' });
  });
});

describe('FC187 F1 — disabledMailTransport', () => {
  it('no envía nada y responde disabled sin lanzar', async () => {
    await expect(disabledMailTransport.send(MESSAGE)).resolves.toEqual({ status: 'disabled' });
  });
});
