import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import db from './db';
import * as Actors from './arcsialActors.repository';
import { recordAuditLog } from './auditService';
import changeActorHandle from './arcsialActorHandle.service';
import type { ArcsialActor } from './arcsialActors.repository';

/**
 * FC210 F2 (T2, filas 5–9) — cambio de handle: W (reservado) → K (tomado) → M (MU del Universo), con el
 * actor y su perfil espejo en la misma TX y sin renombres automáticos.
 */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./arcsialActors.repository', () => ({
  findActorByHandle: vi.fn(),
  findActorByUserId: vi.fn(),
  findActorByTenantId: vi.fn(),
  updateActorHandle: vi.fn(),
  updateProfileHandle: vi.fn(),
}));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const USER_ACTOR = {
  id: 7,
  actorType: 'USER',
  userId: 5,
  tenantId: null,
  handle: 'arc_1',
  muUserId: null,
} as ArcsialActor;
const UNIVERSE_ACTOR = {
  id: 8,
  actorType: 'UNIVERSE',
  userId: null,
  tenantId: 41,
  handle: 'fms_41',
  muUserId: 3,
} as ArcsialActor;
const DUP = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};
const conn = connection as unknown as PoolConnection;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.getConnection).mockResolvedValue(conn);
  vi.mocked(Actors.findActorByHandle).mockResolvedValue(null);
  vi.mocked(Actors.findActorByUserId).mockResolvedValue(USER_ACTOR);
  vi.mocked(Actors.findActorByTenantId).mockResolvedValue(UNIVERSE_ACTOR);
});

describe('changeActorHandle', () => {
  it('fila 9 — reservado ⇒ 400 HANDLE_RESERVED sin consultar la base', async () => {
    expect(await changeActorHandle(5, 'admin')).toMatchObject({
      status: 400,
      code: 'HANDLE_RESERVED',
    });
    expect(Actors.findActorByHandle).not.toHaveBeenCalled();
  });

  it('fila 8 — tomado por otro actor ⇒ 409 sin escribir, también si quien pide no es el MU', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue({ ...UNIVERSE_ACTOR, id: 99 });
    const expected = { status: 409, code: 'HANDLE_ALREADY_TAKEN' };
    expect(await changeActorHandle(5, 'ana')).toMatchObject(expected);
    expect(await changeActorHandle(5, 'ana', 41)).toMatchObject(expected);
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(null);
    expect(await changeActorHandle(5, 'ana', 99)).toMatchObject(expected);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('fila 7 — Universo por alguien que no es su MU, o Universo inexistente ⇒ 403', async () => {
    const expected = { status: 403, code: 'FORBIDDEN_NOT_UNIVERSE_MASTER' };
    expect(await changeActorHandle(5, 'flota_norte', 41)).toMatchObject(expected);
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(null);
    expect(await changeActorHandle(3, 'flota_norte', 99)).toMatchObject(expected);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('persona sin actor ⇒ 404', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue(null);
    expect(await changeActorHandle(5, 'ana')).toMatchObject({
      status: 404,
      code: 'ACTOR_NOT_FOUND',
    });
  });

  it('fila 5 — persona: actor y perfil espejo en la misma TX, con auditoría', async () => {
    expect(await changeActorHandle(5, 'ana')).toEqual({ ok: true, handle: 'ana' });
    expect(Actors.updateActorHandle).toHaveBeenCalledWith(7, 'ana', conn);
    expect(Actors.updateProfileHandle).toHaveBeenCalledWith(5, 'ana', conn);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'user',
        entity_id: '5',
        action: 'UPDATE',
        snapshot_before: { handle: 'arc_1' },
        snapshot_after: { event: 'CHANGE_ARCIAL_HANDLE', handle: 'ana' },
        user_id: 5,
      })
    );
  });

  it('volver a pedir el handle que ya es propio no es un choque', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(USER_ACTOR);
    expect(await changeActorHandle(5, 'arc_1')).toEqual({ ok: true, handle: 'arc_1' });
  });

  it('fila 6 — Universo por su MU: solo el actor; la auditoría es del Universo', async () => {
    expect(await changeActorHandle(3, 'flota_norte', 41)).toEqual({
      ok: true,
      handle: 'flota_norte',
    });
    expect(Actors.updateActorHandle).toHaveBeenCalledWith(8, 'flota_norte', conn);
    expect(Actors.updateProfileHandle).not.toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: 'universe', entity_id: '41', user_id: 3 })
    );
  });

  it('choque tardío del índice único ⇒ 409, revierte y no audita; otro error se propaga', async () => {
    vi.mocked(Actors.updateActorHandle).mockRejectedValueOnce(DUP);
    expect(await changeActorHandle(5, 'ana')).toMatchObject({ status: 409 });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(recordAuditLog).not.toHaveBeenCalled();
    vi.mocked(Actors.updateActorHandle).mockRejectedValueOnce(new Error('down'));
    await expect(changeActorHandle(5, 'ana')).rejects.toThrow('down');
  });
});
