import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import {
  findArcCosmonautRoleId,
  findMuCosmonautRoleId,
  insertCosmonautRoleAssignment,
} from './cosmology.repository';
import { designateMasterOfUniverse, MuAlreadyDesignatedError } from './universeBootstrap';
import { validateLinkCandidate } from './universeUserLinking';
import * as MembershipRepository from './universeMembership.repository';
import { recordAuditLog } from './auditService';
import { linkExistingUserToUniverse, DirectLinkRequest } from './universeDirectLink.service';

/**
 * FC206 F1 — Ω vincula un usuario existente a un Universo existente. T1 del FC (filas 1–9; la 10,
 * ¬O → 403, vive en la prueba de ruta) más los bordes: rol sin sembrar, ancla tomada a mitad de la
 * TX y esquema pre-154.
 */

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./cosmology.repository', () => ({
  findArcCosmonautRoleId: vi.fn(),
  findMuCosmonautRoleId: vi.fn(),
  insertCosmonautRoleAssignment: vi.fn(),
}));
vi.mock('./universeBootstrap', () => {
  class MuAlreadyDesignatedErrorMock extends Error {}
  return {
    designateMasterOfUniverse: vi.fn(),
    MuAlreadyDesignatedError: MuAlreadyDesignatedErrorMock,
  };
});
vi.mock('./universeUserLinking', () => ({ validateLinkCandidate: vi.fn() }));
vi.mock('./universeMembership.repository', () => ({
  findLinkTargetTenant: vi.fn(),
  insertTypedMembership: vi.fn(),
}));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const ARC_ROLE = 7;
const MU_ROLE = 3;
const TENANT = { id: 41, label: 'QA Universo Prueba' };

function request(overrides: Partial<DirectLinkRequest> = {}): DirectLinkRequest {
  return {
    userId: 20,
    tenantId: TENANT.id,
    role: 'ARC',
    confirmUniverseName: TENANT.label,
    callerId: 1,
    ...overrides,
  };
}

/** Candidato válido, Universo existente con o sin MU, catálogo de roles sembrado. */
function given(options: { hasMu: boolean }): void {
  (validateLinkCandidate as Mock).mockResolvedValue({ rfc: 'XAXX010101000' });
  (MembershipRepository.findLinkTargetTenant as Mock).mockResolvedValue({
    ...TENANT,
    hasMu: options.hasMu,
  });
  (findArcCosmonautRoleId as Mock).mockResolvedValue(ARC_ROLE);
  (findMuCosmonautRoleId as Mock).mockResolvedValue(MU_ROLE);
  (designateMasterOfUniverse as Mock).mockResolvedValue('MU_DESIGNATED');
}

beforeEach(() => {
  vi.clearAllMocks();
  (db.getConnection as Mock).mockResolvedValue(connection);
});

describe('T1 — vinculación directa por Ω (FC206 F1)', () => {
  it.each([true, false])(
    'fila 1: ARC (Universo con MU = %s) → 200, membresía ARC y rol Arc con assigned_by, sin designar MU',
    async (hasMu) => {
      given({ hasMu });
      expect(await linkExistingUserToUniverse(request())).toEqual({ ok: true, role: 'ARC' });
      expect(MembershipRepository.insertTypedMembership).toHaveBeenCalledWith(
        20,
        41,
        'ARC',
        connection
      );
      expect(insertCosmonautRoleAssignment).toHaveBeenCalledWith(20, ARC_ROLE, 41, 1, connection);
      expect(designateMasterOfUniverse).not.toHaveBeenCalled();
      expect(connection.commit).toHaveBeenCalled();
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity_id: '20',
          owner_id: 41,
          snapshot_after: { event: 'LINK_USER_TO_UNIVERSE', tenantId: 41, role: 'ARC' },
        })
      );
    }
  );

  it('fila 2: MU en Universo sin MU → 200 y designa el ancla en la misma conexión', async () => {
    given({ hasMu: false });
    expect(await linkExistingUserToUniverse(request({ role: 'MU' }))).toEqual({
      ok: true,
      role: 'MU',
    });
    expect(MembershipRepository.insertTypedMembership).toHaveBeenCalledWith(
      20,
      41,
      'MU',
      connection
    );
    expect(insertCosmonautRoleAssignment).toHaveBeenCalledWith(20, MU_ROLE, 41, 1, connection);
    expect(designateMasterOfUniverse).toHaveBeenCalledWith(connection, {
      tenantId: 41,
      userId: 20,
    });
    expect(connection.commit).toHaveBeenCalled();
  });

  it('fila 3: MU en Universo con MU → 409 MU_ALREADY_DESIGNATED, sin abrir TX (no degrada a ARC)', async () => {
    given({ hasMu: true });
    const result = await linkExistingUserToUniverse(request({ role: 'MU' }));
    expect(result).toMatchObject({ ok: false, status: 409, code: 'MU_ALREADY_DESIGNATED' });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it.each([
    ['otro nombre', 'Otro Universo'],
    ['otra capitalización', 'qa universo prueba'],
  ])('fila 4: confirmación con %s → 400 UNIVERSE_NAME_MISMATCH, sin TX', async (_label, typed) => {
    given({ hasMu: true });
    const result = await linkExistingUserToUniverse(request({ confirmUniverseName: typed }));
    expect(result).toMatchObject({ ok: false, status: 400, code: 'UNIVERSE_NAME_MISMATCH' });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('acepta el nombre con espacios alrededor', async () => {
    given({ hasMu: true });
    const result = await linkExistingUserToUniverse(
      request({ confirmUniverseName: `  ${TENANT.label} ` })
    );
    expect(result).toEqual({ ok: true, role: 'ARC' });
  });

  it('fila 5: Universo inexistente → 404 UNIVERSE_NOT_FOUND', async () => {
    given({ hasMu: false });
    (MembershipRepository.findLinkTargetTenant as Mock).mockResolvedValue(null);
    const result = await linkExistingUserToUniverse(request());
    expect(result).toMatchObject({ ok: false, status: 404, code: 'UNIVERSE_NOT_FOUND' });
  });

  it.each([
    [6, 409, 'LINKED_USER_MISSING_BILLING_PROFILE'],
    [7, 409, 'LINKED_USER_ALREADY_MEMBER'],
    [8, 409, 'LINKED_USER_INACTIVE'],
    [9, 404, 'LINKED_USER_NOT_FOUND'],
    [10, 403, 'CANNOT_LINK_OMEGA_USER'], // FC207 F2
  ])(
    'fila %i: la puerta del candidato responde %i %s antes de mirar el Universo',
    async (_row, status, code) => {
      given({ hasMu: false });
      (validateLinkCandidate as Mock).mockResolvedValue({ ok: false, status, code, message: code });
      const result = await linkExistingUserToUniverse(request());
      expect(result).toMatchObject({ ok: false, status, code });
      expect(MembershipRepository.findLinkTargetTenant).not.toHaveBeenCalled();
      expect(db.getConnection).not.toHaveBeenCalled();
    }
  );
});

describe('bordes de la vinculación directa', () => {
  it.each([
    ['ARC', findArcCosmonautRoleId],
    ['MU', findMuCosmonautRoleId],
  ] as const)('rol %s sin sembrar → 500 ROLE_NOT_CONFIGURED', async (role, lookup) => {
    given({ hasMu: false });
    (lookup as Mock).mockResolvedValue(null);
    const result = await linkExistingUserToUniverse(request({ role }));
    expect(result).toMatchObject({ ok: false, status: 500, code: 'ROLE_NOT_CONFIGURED' });
  });

  it('otro Ω tomó el ancla a mitad de la TX → rollback y 409 MU_ALREADY_DESIGNATED, sin auditoría', async () => {
    given({ hasMu: false });
    (designateMasterOfUniverse as Mock).mockRejectedValue(new MuAlreadyDesignatedError(41));
    const result = await linkExistingUserToUniverse(request({ role: 'MU' }));
    expect(result).toMatchObject({ ok: false, status: 409, code: 'MU_ALREADY_DESIGNATED' });
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('esquema pre-154 (sin ancla) → rollback y el error sube', async () => {
    given({ hasMu: false });
    (designateMasterOfUniverse as Mock).mockResolvedValue('SCHEMA_PRE_154');
    await expect(linkExistingUserToUniverse(request({ role: 'MU' }))).rejects.toThrow(
      'SCHEMA_PRE_154'
    );
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });
});
