import { describe, it, expect } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import requireFieldPermission from './requireFieldPermission';

/**
 * AT-FC18-D2: requireFieldPermission — FC-18 FaseD-2
 * Unit tests — pure function, no Fastify server, no DB.
 */

function makeRequest(permissions: string[]): FastifyRequest {
  return { user: { id: 1, permissions } } as unknown as FastifyRequest;
}

const NOOP_REPLY = {} as FastifyReply;

async function applyHook(
  permSlug: string,
  permissions: string[],
  payload: unknown
): Promise<unknown> {
  const hook = requireFieldPermission(permSlug);
  return hook(makeRequest(permissions), NOOP_REPLY, payload);
}

describe('FC-18 FaseD-2 — requireFieldPermission (AT-FC18-D2-FP)', () => {
  // AT-FC18-D2-FP-1: User without vin:decrypt gets numeroSerie masked
  it('AT-FC18-D2-FP-1 — missing vin:decrypt masks numeroSerie to "***"', async () => {
    const payload = JSON.stringify({ id: 1, numeroSerie: 'DECRYPTED-VIN', marca: 'Toyota' });
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed.numeroSerie).toBe('***');
    expect(parsed.marca).toBe('Toyota');
  });

  // AT-FC18-D2-FP-2: User with vin:decrypt receives original value
  it('AT-FC18-D2-FP-2 — holding vin:decrypt passes numeroSerie unmasked', async () => {
    const payload = JSON.stringify({ id: 1, numeroSerie: 'DECRYPTED-VIN' });
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any', 'fleet:unit:field:vin:decrypt'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed.numeroSerie).toBe('DECRYPTED-VIN');
  });

  // AT-FC18-D2-FP-3: Archon (*) always receives unmasked data
  it('AT-FC18-D2-FP-3 — Archon (*) bypasses masking for any field', async () => {
    const payload = JSON.stringify({ numeroSerie: 'VIN-SECRET', placas: 'ABC-123' });
    const result = await applyHook('fleet:unit:field:vin:decrypt', ['*'], payload);
    const parsed = JSON.parse(result as string);
    expect(parsed.numeroSerie).toBe('VIN-SECRET');
  });

  // AT-FC18-D2-FP-4: placas masked when missing plates:decrypt
  it('AT-FC18-D2-FP-4 — missing plates:decrypt masks placas to "***"', async () => {
    const payload = JSON.stringify({ placas: 'ABC-123', modelo: 'Hilux' });
    const result = await applyHook(
      'fleet:unit:field:plates:decrypt',
      ['fleet:unit:view:any'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed.placas).toBe('***');
    expect(parsed.modelo).toBe('Hilux');
  });

  // AT-FC18-D2-FP-5: circulationCardNumber masked when missing circcard:decrypt
  it('AT-FC18-D2-FP-5 — missing circcard:decrypt masks circulationCardNumber', async () => {
    const payload = JSON.stringify({ circulationCardNumber: 'TC-9999', year: 2023 });
    const result = await applyHook(
      'fleet:unit:field:circcard:decrypt',
      ['fleet:unit:view:any'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed.circulationCardNumber).toBe('***');
    expect(parsed.year).toBe(2023);
  });

  // AT-FC18-D2-FP-6: Array of items — every item masked
  it('AT-FC18-D2-FP-6 — array payload: every item has numeroSerie masked', async () => {
    const items = [
      { id: 1, numeroSerie: 'VIN-1', marca: 'Ford' },
      { id: 2, numeroSerie: 'VIN-2', marca: 'Chevy' },
    ];
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'],
      JSON.stringify(items)
    );
    const parsed = JSON.parse(result as string) as Array<{ numeroSerie: string; marca: string }>;
    expect(parsed).toHaveLength(2);
    parsed.forEach((item) => expect(item.numeroSerie).toBe('***'));
    expect(parsed[0].marca).toBe('Ford');
  });

  // AT-FC18-D2-FP-7: Field not present in payload — no error, payload unchanged
  it('AT-FC18-D2-FP-7 — field absent in payload passes through without error', async () => {
    const payload = JSON.stringify({ marca: 'Toyota', modelo: 'Corolla' });
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed).not.toHaveProperty('numeroSerie');
    expect(parsed.marca).toBe('Toyota');
  });

  // AT-FC18-D2-FP-8: Unknown permSlug — payload unchanged
  it('AT-FC18-D2-FP-8 — unknown permSlug passes payload unchanged', async () => {
    const payload = JSON.stringify({ secret: 'value' });
    const result = await applyHook('unknown:perm:slug', ['fleet:unit:view:any'], payload);
    expect(result).toBe(payload);
  });

  // AT-FC18-D2-FP-9: Non-string payload passes through unchanged
  it('AT-FC18-D2-FP-9 — non-string payload (null) passes through unchanged', async () => {
    const result = await applyHook('fleet:unit:field:vin:decrypt', ['fleet:unit:view:any'], null);
    expect(result).toBeNull();
  });

  // AT-FC18-D2-FP-10: AES mask is exactly '***' (not null or undefined)
  it('AT-FC18-D2-FP-10 — masked value is exactly the string "***"', async () => {
    const payload = JSON.stringify({ numeroSerie: 'REAL-VIN' });
    const result = await applyHook('fleet:unit:field:vin:decrypt', [], payload);
    const parsed = JSON.parse(result as string);
    expect(parsed.numeroSerie).toBe('***');
    expect(typeof parsed.numeroSerie).toBe('string');
  });

  // AT-FC18-D2-FP-11: Other fields in same object are NOT masked
  it('AT-FC18-D2-FP-11 — masking one field leaves all other fields intact', async () => {
    const payload = JSON.stringify({
      id: 99,
      marca: 'Nissan',
      modelo: 'NP300',
      numeroSerie: 'VIN-SECRET',
      anio: 2022,
      status: 'ACTIVO',
    });
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'],
      payload
    );
    const parsed = JSON.parse(result as string);
    expect(parsed.id).toBe(99);
    expect(parsed.marca).toBe('Nissan');
    expect(parsed.modelo).toBe('NP300');
    expect(parsed.anio).toBe(2022);
    expect(parsed.status).toBe('ACTIVO');
    expect(parsed.numeroSerie).toBe('***');
  });

  // AT-FC18-D2-FP-12: No request.user → returns payload unchanged (line 45)
  it('AT-FC18-D2-FP-12 — request without user returns payload unchanged (line 45)', async () => {
    const hook = requireFieldPermission('fleet:unit:field:vin:decrypt');
    const payload = JSON.stringify({ numeroSerie: 'VIN-SECRET' });
    const noUserRequest = {} as FastifyRequest; // no user field
    const result = await hook(noUserRequest, NOOP_REPLY, payload);
    expect(result).toBe(payload); // untouched
  });

  // AT-FC18-D2-FP-13: Array of primitives → maskFields returns primitive unchanged (lines 39-40)
  it('AT-FC18-D2-FP-12 — array of string primitives: maskFields returns each primitive unchanged (lines 39-40)', async () => {
    const payload = JSON.stringify(['item1', 'item2', 'item3']);
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'], // no decrypt perm → tries to mask, but no field in primitives
      payload
    );
    const parsed = JSON.parse(result as string) as string[];
    expect(parsed).toEqual(['item1', 'item2', 'item3']);
  });

  // AT-FC18-D2-FP-13: Invalid JSON → catch block returns original payload (lines 62-63)
  it('AT-FC18-D2-FP-13 — invalid JSON payload: catch returns original string unchanged (lines 62-63)', async () => {
    const invalidJson = '{not valid json}';
    const result = await applyHook(
      'fleet:unit:field:vin:decrypt',
      ['fleet:unit:view:any'], // no decrypt perm → tries to JSON.parse → throws → catch
      invalidJson
    );
    expect(result).toBe(invalidJson);
  });

  // AT-FC18-D2-FP-14: Two independent hooks applied sequentially mask respective fields
  it('AT-FC18-D2-FP-14 — two hooks applied in sequence mask their respective fields independently', async () => {
    const noDecryptPerms = ['fleet:unit:view:any'];
    const payload = JSON.stringify({
      numeroSerie: 'VIN',
      placas: 'ABC',
      circulationCardNumber: 'TC',
    });

    const hook1 = requireFieldPermission('fleet:unit:field:vin:decrypt');
    const hook2 = requireFieldPermission('fleet:unit:field:plates:decrypt');
    const hook3 = requireFieldPermission('fleet:unit:field:circcard:decrypt');

    const req = makeRequest(noDecryptPerms);
    const step1 = await hook1(req, NOOP_REPLY, payload);
    const step2 = await hook2(req, NOOP_REPLY, step1);
    const step3 = await hook3(req, NOOP_REPLY, step2);

    const parsed = JSON.parse(step3 as string);
    expect(parsed.numeroSerie).toBe('***');
    expect(parsed.placas).toBe('***');
    expect(parsed.circulationCardNumber).toBe('***');
  });
});
