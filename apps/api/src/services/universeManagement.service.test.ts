import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as UniverseLabelRepository from './universeLabel.repository';
import { recordAuditLog } from './auditService';
import { UniverseMutationError } from './universeLabel';
import {
  assertUniqueUniverseLabel,
  canMutateUniverse,
  renameUniverse,
  type UniverseActor,
} from './universeManagement.service';

/**
 * FC192 — Universe_Rename_And_Label_Uniqueness (servicio). La TX se prueba con un `getConnection`
 * simulado: se verifica commit/rollback/release, el orden de las operaciones y que la falla de la
 * sincronía de `common_catalogs` (0 filas) deshace TODO (Cond.R-192, "nunca una tabla stale").
 */

const connection = vi.hoisted(() => ({
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
}));

vi.mock('./db', () => ({
  default: { getConnection: vi.fn(() => Promise.resolve(connection)) },
}));
vi.mock('./universeLabel.repository', () => ({
  findUniverseIdentityForUpdate: vi.fn(),
  findUniverseIdByLabel: vi.fn(),
  renameTenantLabel: vi.fn(),
  renameUniverseCatalogLabel: vi.fn(),
}));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const repo = UniverseLabelRepository as unknown as Record<string, Mock>;

const OMEGA: UniverseActor = { id: 1, roleId: 0, roleName: 'GrayMan', permissions: ['*'] };
const TENANT_ROLE: UniverseActor = {
  id: 20,
  roleId: 3,
  roleName: 'Admin',
  permissions: ['fleet:view'],
};
const IDENTITY = { id: 9, label: 'Universo Alpha', code: 'UNIV_ALPHA_A1B2C3' };

function happyPath(): void {
  repo.findUniverseIdentityForUpdate.mockResolvedValue(IDENTITY);
  repo.findUniverseIdByLabel.mockResolvedValue(null);
  repo.renameTenantLabel.mockResolvedValue(1);
  repo.renameUniverseCatalogLabel.mockResolvedValue(1);
}

describe('FC192 — canMutateUniverse (política; hoy solo Ω)', () => {
  it('Ω por roleId 0 y Ω por comodín "*" pueden', () => {
    expect(canMutateUniverse(OMEGA, 9)).toBe(true);
    expect(canMutateUniverse({ id: 2, roleId: 5, permissions: ['*'] }, 9)).toBe(true);
  });

  it('un actor que no es Ω no puede (la puerta al MU se abre cambiando SOLO esta política)', () => {
    expect(canMutateUniverse(TENANT_ROLE, 9)).toBe(false);
  });

  it.each([[0], [-3], [1.5], [Number.NaN]])(
    'un id de universo inválido (%s) se rechaza incluso para Ω',
    (tenantId) => {
      expect(canMutateUniverse(OMEGA, tenantId)).toBe(false);
    }
  );
});

describe('FC192 — assertUniqueUniverseLabel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin colisión resuelve; al renombrar excluye al propio tenant, al crear excluye 0', async () => {
    repo.findUniverseIdByLabel.mockResolvedValue(null);
    const executor = {} as never;

    await expect(assertUniqueUniverseLabel(executor, 'Nombre Libre', 9)).resolves.toBeUndefined();
    await expect(assertUniqueUniverseLabel(executor, 'Nombre Libre')).resolves.toBeUndefined();

    expect(repo.findUniverseIdByLabel).toHaveBeenNthCalledWith(1, 'Nombre Libre', 9, executor);
    expect(repo.findUniverseIdByLabel).toHaveBeenNthCalledWith(2, 'Nombre Libre', 0, executor);
  });

  it('con colisión lanza UniverseMutationError 409 UNIVERSE_NAME_ALREADY_EXISTS', async () => {
    repo.findUniverseIdByLabel.mockResolvedValue(7);

    const attempt = assertUniqueUniverseLabel({} as never, 'Flota Central');

    await expect(attempt).rejects.toBeInstanceOf(UniverseMutationError);
    await expect(attempt).rejects.toMatchObject({
      failure: { status: 409, code: 'UNIVERSE_NAME_ALREADY_EXISTS' },
    });
  });
});

describe('FC192 — renameUniverse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    happyPath();
  });

  it('Scenario 1: renombra en tenants Y common_catalogs dentro de UNA TX, audita y devuelve {id, code, label}', async () => {
    const result = await renameUniverse(OMEGA, 9, 'Universo Beta');

    expect(result).toEqual({
      ok: true,
      universe: { id: 9, code: 'UNIV_ALPHA_A1B2C3', label: 'Universo Beta' },
    });
    expect(repo.findUniverseIdentityForUpdate).toHaveBeenCalledWith(9, connection);
    expect(repo.findUniverseIdByLabel).toHaveBeenCalledWith('Universo Beta', 9, connection);
    expect(repo.renameTenantLabel).toHaveBeenCalledWith(9, 'Universo Beta', connection);
    expect(repo.renameUniverseCatalogLabel).toHaveBeenCalledWith(9, 'Universo Beta', connection);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('audita con entity_type "universe", user_id del actor y su rol dentro de snapshot_after (0 DDL)', async () => {
    await renameUniverse(OMEGA, 9, 'Universo Beta');

    expect(recordAuditLog).toHaveBeenCalledWith({
      entity_type: 'universe',
      entity_id: '9',
      action: 'UPDATE',
      snapshot_before: { label: 'Universo Alpha' },
      snapshot_after: { label: 'Universo Beta', actorRole: 'GrayMan' },
      reason: 'UNIVERSE_LABEL_RENAMED',
      user_id: 1,
    });
  });

  it('sin roleName en el JWT el rol auditado es null (no inventa un rol)', async () => {
    await renameUniverse({ id: 1, roleId: 0, permissions: ['*'] }, 9, 'Universo Beta');

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot_after: { label: 'Universo Beta', actorRole: null } })
    );
  });

  it('normaliza el nombre aunque el llamador no haya pasado por la ruta', async () => {
    const result = await renameUniverse(OMEGA, 9, '  Universo    Beta ');

    expect(result).toMatchObject({ ok: true, universe: { label: 'Universo Beta' } });
    expect(repo.renameTenantLabel).toHaveBeenCalledWith(9, 'Universo Beta', connection);
  });

  it('Scenario 4: un actor que no es Ω recibe 403 FORBIDDEN y no se abre ninguna conexión', async () => {
    const result = await renameUniverse(TENANT_ROLE, 9, 'Universo Beta');

    expect(result).toMatchObject({ ok: false, status: 403, code: 'FORBIDDEN' });
    expect(connection.beginTransaction).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('universo inexistente ⇒ 404 TENANT_NOT_FOUND, ROLLBACK, sin escrituras ni auditoría', async () => {
    repo.findUniverseIdentityForUpdate.mockResolvedValue(null);

    const result = await renameUniverse(OMEGA, 404, 'Universo Beta');

    expect(result).toMatchObject({ ok: false, status: 404, code: 'TENANT_NOT_FOUND' });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(repo.renameTenantLabel).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('Scenario 2: el nombre ya lo usa OTRO universo ⇒ 409, ROLLBACK, ninguna tabla modificada', async () => {
    repo.findUniverseIdByLabel.mockResolvedValue(7);

    const result = await renameUniverse(OMEGA, 9, '  flota   central ');

    expect(result).toMatchObject({ ok: false, status: 409, code: 'UNIVERSE_NAME_ALREADY_EXISTS' });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(repo.renameTenantLabel).not.toHaveBeenCalled();
    expect(repo.renameUniverseCatalogLabel).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('universo SIN fila UNIVERSE_TENANT (code null) ⇒ 500 UNIVERSE_CATALOG_DESYNC antes de escribir nada', async () => {
    repo.findUniverseIdentityForUpdate.mockResolvedValue({ ...IDENTITY, code: null });

    const result = await renameUniverse(OMEGA, 9, 'Universo Beta');

    expect(result).toMatchObject({ ok: false, status: 500, code: 'UNIVERSE_CATALOG_DESYNC' });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(repo.renameTenantLabel).not.toHaveBeenCalled();
  });

  it('common_catalogs afecta 0 filas ⇒ ROLLBACK total (tenants NO queda con el nombre nuevo), sin commit ni auditoría', async () => {
    repo.renameUniverseCatalogLabel.mockResolvedValue(0);

    const result = await renameUniverse(OMEGA, 9, 'Universo Beta');

    expect(result).toMatchObject({ ok: false, status: 500, code: 'UNIVERSE_CATALOG_DESYNC' });
    expect(repo.renameTenantLabel).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('tenants afecta 0 filas ⇒ también ROLLBACK total', async () => {
    repo.renameTenantLabel.mockResolvedValue(0);

    const result = await renameUniverse(OMEGA, 9, 'Universo Beta');

    expect(result).toMatchObject({ ok: false, status: 500, code: 'UNIVERSE_CATALOG_DESYNC' });
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
  });

  it('un error inesperado se propaga tras ROLLBACK y liberar la conexión (nunca queda una TX abierta)', async () => {
    repo.renameTenantLabel.mockRejectedValue(new Error('DB connection lost'));

    await expect(renameUniverse(OMEGA, 9, 'Universo Beta')).rejects.toThrow('DB connection lost');

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
