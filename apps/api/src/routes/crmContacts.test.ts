/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-5 CRM_Directory_Contacts FaseB — API CRUD tests
 *
 * AT-CRM-B-1:  GET /contacts 401 without JWT
 * AT-CRM-B-2:  GET /contacts 200 admin sees all (2 contacts)
 * AT-CRM-B-3:  GET /contacts 200 scoped user sees only own owner contacts
 * AT-CRM-B-4:  GET /contacts/:id 200 owner-scoped access
 * AT-CRM-B-5:  GET /contacts/:id 403 wrong owner
 * AT-CRM-B-6:  GET /contacts/:id 404 not found
 * AT-CRM-B-7:  POST /contacts 201 creates contact, email/phone encrypted
 * AT-CRM-B-8:  POST /contacts 400 missing required fields
 * AT-CRM-B-9:  POST /contacts 403 wrong owner
 * AT-CRM-B-10: PATCH /contacts/:id 200 updates fields
 * AT-CRM-B-11: DELETE /contacts/:id 200 deletes
 * AT-CRM-B-12: DELETE /contacts/:id 403 wrong owner
 */

vi.mock('../services/db', () => ({
  default: { execute: vi.fn(), query: vi.fn(), getConnection: vi.fn() },
}));
vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn().mockResolvedValue([5]),
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc(${v})`),
    decrypt: vi.fn((v: string) => v.replace(/^enc\((.+)\)$/, '$1')),
    generateBlindIndex: vi.fn((v: string) => `SVR-${v.substring(0, 16).toUpperCase()}`),
  },
}));

const MOCK_CONTACT_ROW = {
  id: 1,
  owner_id: 5,
  full_name: 'Maria García',
  company: 'PIIC SA de CV',
  role_label: 'Gerente',
  email: 'enc(maria@piic.mx)',
  email_bi: 'SVR-MARIA@PIIC.MX00000',
  phone: 'enc(5512345678)',
  notes: 'Contacto principal',
  is_active: 1,
  created_at: '2026-06-23T00:00:00Z',
  updated_at: '2026-06-23T00:00:00Z',
};

describe('GET/POST/PATCH/DELETE /v1/contacts — FC-5 CRM FaseB', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;
  let wrongOwnerToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    scopedToken = jwt.sign({
      id: 2,
      username: 'owner.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
    wrongOwnerToken = jwt.sign({
      id: 9,
      username: 'other.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-CRM-B-1: GET /contacts 401 without JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/contacts' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM-B-2: GET /contacts 200 admin sees all contacts', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [MOCK_CONTACT_ROW, { ...MOCK_CONTACT_ROW, id: 2 }],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.contacts).toHaveLength(2);
    expect(body.contacts[0].email).toBe('maria@piic.mx'); // decrypted
  });

  it('AT-CRM-B-3: GET /contacts 200 scoped user filtered by owner', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([[MOCK_CONTACT_ROW], undefined]); // contacts query
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const sql = vi.mocked(db.execute).mock.calls[1][0] as string;
    expect(sql).toContain('owner_id IN');
  });

  it('AT-CRM-B-4: GET /contacts/:id 200 for correct owner', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[MOCK_CONTACT_ROW], undefined]) // SELECT by id
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]); // getCallerOwnerIds
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.contact.id).toBe(1);
    expect(body.contact.email).toBe('maria@piic.mx');
  });

  it('AT-CRM-B-5: GET /contacts/:id 403 wrong owner', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[MOCK_CONTACT_ROW], undefined]) // contact has owner_id=5
      .mockResolvedValueOnce([[{ owner_id: 99 }], undefined]); // caller has owner_id=99
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${wrongOwnerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM-B-6: GET /contacts/:id 404 not found', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/999',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('AT-CRM-B-7: POST /contacts 201 creates contact with encrypted PII', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }, undefined]); // INSERT
    const res = await app.inject({
      method: 'POST',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5, fullName: 'Luis Morales', email: 'luis@piic.mx', phone: '5599887766' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(42);
    // Verify encrypted values were passed to INSERT
    const insertCall = vi.mocked(db.execute).mock.calls[1];
    expect(insertCall[1]).toContain('enc(luis@piic.mx)');
    expect(insertCall[1]).toContain('enc(5599887766)');
  });

  it('AT-CRM-B-8: POST /contacts 400 missing fullName', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-CRM-B-9: POST /contacts 403 caller does not belong to ownerId', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[{ owner_id: 7 }], undefined]); // caller has owner_id=7
    const res = await app.inject({
      method: 'POST',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 99, fullName: 'Intruder' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM-B-10: PATCH /contacts/:id 200 updates fields', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT owner_id
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { fullName: 'Maria García Updated', isActive: false },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-11: DELETE /contacts/:id 200 deletes successfully', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT owner_id
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // DELETE
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-12: DELETE /contacts/:id 403 wrong owner', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // contact owner=5
      .mockResolvedValueOnce([[{ owner_id: 99 }], undefined]); // caller owner=99
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${wrongOwnerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM-B-13: DELETE /contacts/:id 401 sin JWT', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/contacts/1',
    });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM-B-14: DELETE /contacts/:id 500 error de DB', async () => {
    // adminToken has '*' → hasAdminAccess=true → skip ownerIds → DELETE throws
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT contact
      .mockRejectedValueOnce(new Error('DB connection lost')); // DELETE throws
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTACT_DELETE_FAIL');
  });

  it('AT-CRM-B-15: PATCH /contacts/:id 403 cuando el owner del caller no coincide (line 256)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT contact → owner=5
      .mockResolvedValueOnce([[{ owner_id: 9 }], undefined]); // getCallerOwnerIds → [9]
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${wrongOwnerToken}`, 'content-type': 'application/json' },
      payload: { fullName: 'Updated Name' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('Access denied');
  });

  it('AT-CRM-B-16: PATCH /contacts/:id 500 CONTACT_UPDATE_FAIL cuando UPDATE falla (line 273)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT contact
      .mockRejectedValueOnce(new Error('DB connection lost')); // UPDATE throws
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { fullName: 'Updated Name' },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTACT_UPDATE_FAIL');
  });

  it('AT-CRM-B-17: POST /contacts 500 CONTACT_CREATE_FAIL cuando INSERT falla (lines 220-222)', async () => {
    // adminToken has * → hasAdminAccess=true → skips getCallerOwnerIds → INSERT throws
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5, fullName: 'Test User', email: 'test@piic.mx' },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTACT_CREATE_FAIL');
  });

  it('AT-CRM-B-18: PATCH /contacts/:id 401 sin JWT (lines 234-235)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      payload: { fullName: 'Updated Name' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM-B-19: GET /contacts/:id 401 sin JWT (lines 143-145)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/1',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM-B-20: GET /contacts/:id 400 id NaN inválido (line 150)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/abc',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('Invalid id');
  });

  it('AT-CRM-B-21: GET /contacts/:id 500 CONTACT_FETCH_FAIL cuando DB throws (lines 171-172)', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTACT_FETCH_FAIL');
  });

  it('AT-CRM-B-22: POST /contacts 401 sin JWT (lines 182-183)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/contacts',
      headers: { 'content-type': 'application/json' },
      payload: { ownerId: 5, fullName: 'Test' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM-B-23: PATCH /contacts/:id 200 con phone=null (rama null de phone, line 96)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // SELECT contact owner
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { phone: null },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-24: GET /contacts 500 CONTACTS_FETCH_FAIL cuando DB throws (lines 133-134)', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/contacts',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTACTS_FETCH_FAIL');
  });

  it('AT-CRM-B-25: PATCH /contacts/:id 200 con roleLabel (buildPatchClauses line 75-78)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { roleLabel: 'Gerente Actualizado' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-26: PATCH /contacts/:id 200 con notes (buildPatchClauses lines 79-82)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { notes: 'Nota actualizada de contacto' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-27: PATCH /contacts/:id 200 con email truthy (buildPatchClauses lines 88-93 rama encrypt)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { email: 'nuevo@piic.mx' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-28: PATCH /contacts/:id 200 con email null (buildPatchClauses lines 90-91 rama null)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { email: null },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-CRM-B-29: PATCH /contacts/:id 200 con company (buildPatchClauses lines 71-74)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/contacts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { company: 'Nueva Empresa SA de CV' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });
});
