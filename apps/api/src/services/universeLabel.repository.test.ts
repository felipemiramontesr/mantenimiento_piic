import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import {
  findUniverseIdByLabel,
  findUniverseIdentityForUpdate,
  renameTenantLabel,
  renameUniverseCatalogLabel,
} from './universeLabel.repository';

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

/** FC192 — SQL del nombre del universo: columnas explícitas, parámetros ligados, filas afectadas. */

const execute = (): Mock => db.execute as Mock;

describe('FC192 — universeLabel.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findUniverseIdentityForUpdate: bloquea la fila (FOR UPDATE) y une la fila UNIVERSE_TENANT del catálogo', async () => {
    const row = { id: 9, label: 'Flota Central', code: 'UNIV_FLOTA_CENTRAL_A1B2C3' };
    execute().mockResolvedValue([[row], undefined]);

    await expect(findUniverseIdentityForUpdate(9)).resolves.toEqual(row);

    const [sql, params] = execute().mock.calls[0];
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain("cc.category = 'UNIVERSE_TENANT'");
    expect(sql).not.toContain('*');
    expect(params).toEqual([9]);
  });

  it('findUniverseIdentityForUpdate: universo inexistente ⇒ null', async () => {
    execute().mockResolvedValue([[], undefined]);
    await expect(findUniverseIdentityForUpdate(404)).resolves.toBeNull();
  });

  it('findUniverseIdByLabel: compara normalizado (LOWER/TRIM), excluye al propio tenant y devuelve el id ajeno', async () => {
    execute().mockResolvedValue([[{ id: '7' }], undefined]);

    await expect(findUniverseIdByLabel('flota central', 9)).resolves.toBe(7);

    const [sql, params] = execute().mock.calls[0];
    expect(sql).toContain('LOWER(TRIM(label)) = LOWER(?)');
    expect(sql).toContain('id <> ?');
    expect(params).toEqual(['flota central', 9]);
  });

  it('findUniverseIdByLabel: sin colisión ⇒ null', async () => {
    execute().mockResolvedValue([[], undefined]);
    await expect(findUniverseIdByLabel('Nombre Libre', 0)).resolves.toBeNull();
  });

  it('renameTenantLabel: UPDATE tenants y devuelve las filas afectadas', async () => {
    execute().mockResolvedValue([{ affectedRows: 1 }, undefined]);

    await expect(renameTenantLabel(9, 'Universo Beta')).resolves.toBe(1);

    expect(execute().mock.calls[0]).toEqual([
      'UPDATE tenants SET label = ? WHERE id = ?',
      ['Universo Beta', 9],
    ]);
  });

  it('renameUniverseCatalogLabel: solo toca la fila UNIVERSE_TENANT del universo', async () => {
    execute().mockResolvedValue([{ affectedRows: 0 }, undefined]);

    await expect(renameUniverseCatalogLabel(9, 'Universo Beta')).resolves.toBe(0);

    const [sql, params] = execute().mock.calls[0];
    expect(sql).toContain("category = 'UNIVERSE_TENANT'");
    expect(params).toEqual(['Universo Beta', 9]);
  });

  it('usa el executor recibido en vez de db (participa en la TX del llamador)', async () => {
    const own = vi.fn().mockResolvedValue([[], undefined]);

    await findUniverseIdByLabel('Otro Nombre', 3, { execute: own } as never);

    expect(own).toHaveBeenCalledTimes(1);
    expect(execute()).not.toHaveBeenCalled();
  });
});
