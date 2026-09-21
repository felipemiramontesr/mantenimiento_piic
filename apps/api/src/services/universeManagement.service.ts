import type { Pool, PoolConnection } from 'mysql2/promise';
import db from './db';
import * as UniverseLabelRepository from './universeLabel.repository';
import { recordAuditLog } from './auditService';
import { isOmegaCaller } from '../middleware/cosmonautMiddleware';
import {
  CATALOG_DESYNC_FAILURE,
  LABEL_CONFLICT,
  TENANT_NOT_FOUND_FAILURE,
  UniverseMutationError,
  normalizeUniverseLabel,
  type UniverseMutationFailure,
} from './universeLabel';

/**
 * FC192 — Universe_Rename_And_Label_Uniqueness. Mutación de identidad legible del universo
 * (`label`), separada de la composición SC/cluster de `cosmology.service.ts`.
 * DISEÑO DESACOPLADO (Cond.R-192 A1): el guard `requireOmega()` vive SOLO en la ruta; este servicio
 * decide con `canMutateUniverse(actor, tenantId)`, así que abrir la puerta al MU (FC-E) cambia esa
 * política y no la lógica de datos. `id` y `code` del universo jamás se tocan.
 */

/** Quién pide la mutación (viene del JWT en la ruta). */
export interface UniverseActor {
  id: number;
  roleId?: number;
  roleName?: string | null;
  permissions?: string[];
}

export type RenameUniverseResult =
  | { ok: true; universe: { id: number; code: string; label: string } }
  | ({ ok: false } & UniverseMutationFailure);

const FORBIDDEN_FAILURE: UniverseMutationFailure = {
  status: 403,
  code: 'FORBIDDEN',
  message: 'No autorizado para modificar este universo',
};

/** Política de mutación de identidad de un universo. HOY: solo Ω (y el id debe ser un entero
 *  positivo). FC-E la ampliará al MU del PROPIO universo sin tocar el resto del flujo. */
export function canMutateUniverse(actor: UniverseActor, tenantId: number): boolean {
  return Number.isInteger(tenantId) && tenantId > 0 && isOmegaCaller(actor);
}

/** Unicidad del nombre (normalizado, sin distinguir mayúsculas ni acentos): lanza
 *  `UniverseMutationError(409 UNIVERSE_NAME_ALREADY_EXISTS)` si OTRO universo ya lo usa.
 *  `excludeTenantId` excluye al propio universo al renombrar (crear no pasa ninguno). */
export async function assertUniqueUniverseLabel(
  executor: Pool | PoolConnection,
  label: string,
  excludeTenantId?: number
): Promise<void> {
  const collision = await UniverseLabelRepository.findUniverseIdByLabel(
    label,
    excludeTenantId ?? 0,
    executor
  );
  if (collision !== null) throw new UniverseMutationError(LABEL_CONFLICT);
}

interface RenamedUniverse {
  previousLabel: string;
  universe: { id: number; code: string; label: string };
}

/** La TX del renombrado: bloquea la fila, exige unicidad y actualiza `tenants.label` Y
 *  `common_catalogs.label`. Cualquier falla (o una fila de catálogo ausente) ⇒ ROLLBACK total. */
async function runRenameTransaction(tenantId: number, label: string): Promise<RenamedUniverse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const current = await UniverseLabelRepository.findUniverseIdentityForUpdate(
      tenantId,
      connection
    );
    if (!current) throw new UniverseMutationError(TENANT_NOT_FOUND_FAILURE);
    if (current.code === null) throw new UniverseMutationError(CATALOG_DESYNC_FAILURE);
    await assertUniqueUniverseLabel(connection, label, tenantId);
    const tenantRows = await UniverseLabelRepository.renameTenantLabel(tenantId, label, connection);
    const catalogRows = await UniverseLabelRepository.renameUniverseCatalogLabel(
      tenantId,
      label,
      connection
    );
    if (tenantRows !== 1 || catalogRows !== 1) {
      throw new UniverseMutationError(CATALOG_DESYNC_FAILURE);
    }
    await connection.commit();
    return {
      previousLabel: current.label,
      universe: { id: tenantId, code: current.code, label },
    };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** Renombra un universo. El nombre llega ya validado por `universeLabelSchema` en la ruta; aquí se
 *  vuelve a normalizar (idempotente) por si otro llamador del servicio no pasó por la ruta.
 *  Audita con `user_id` = actor y el rol del actor dentro de `snapshot_after` (0 DDL, Cond.R-192 A3). */
export async function renameUniverse(
  actor: UniverseActor,
  tenantId: number,
  label: string
): Promise<RenameUniverseResult> {
  if (!canMutateUniverse(actor, tenantId)) return { ok: false, ...FORBIDDEN_FAILURE };
  const normalized = normalizeUniverseLabel(label);
  try {
    const renamed = await runRenameTransaction(tenantId, normalized);
    await recordAuditLog({
      entity_type: 'universe',
      entity_id: String(tenantId),
      action: 'UPDATE',
      snapshot_before: { label: renamed.previousLabel },
      snapshot_after: { label: normalized, actorRole: actor.roleName ?? null },
      reason: 'UNIVERSE_LABEL_RENAMED',
      user_id: actor.id,
    });
    return { ok: true, universe: renamed.universe };
  } catch (e) {
    if (e instanceof UniverseMutationError) return { ok: false, ...e.failure };
    throw e;
  }
}
