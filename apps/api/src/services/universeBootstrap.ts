/**
 * 🔱 FC 062 F6 (enmienda v1.2 — Zero_State_GrayMan_Only) — Universe Bootstrap.
 * §24.12: I1 |MU(U)| = 1 · I2 create(MU) ∈ Admin_tools(Ω) · I3 elevate solo Ω.
 * La designación del Master of Universe ocurre DENTRO de la transacción de
 * creación del Universo (POST /onboarding/universe — gated por permiso '*',
 * es decir, exclusivo de Ω). La auto-promoción NO existe en el sistema.
 * Deriva de esquema declarada: si la DB no tiene aún las columnas de la
 * migración 154 (cosmonaut_type / mu_user_id), retorna SCHEMA_PRE_154 sin
 * escribir — la creación del Universo no se bloquea por el gap (item K).
 */
import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MuAlreadyDesignatedError extends Error {
  constructor(tenantId: number) {
    super(`I1 violado: el Universo ${tenantId} ya tiene un MU anclado (|MU(U)| = 1)`);
    this.name = 'MuAlreadyDesignatedError';
  }
}

export type MuDesignationResult = 'MU_DESIGNATED' | 'SCHEMA_PRE_154';

let schemaHas154: boolean | null = null;

export function resetBootstrapSchemaCache(): void {
  schemaHas154 = null;
}

async function detectSchema154(connection: PoolConnection): Promise<boolean> {
  if (schemaHas154 !== null) return schemaHas154;
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS present FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND ((TABLE_NAME = 'tenant_user_memberships' AND COLUMN_NAME = 'cosmonaut_type')
         OR (TABLE_NAME = 'tenants' AND COLUMN_NAME = 'mu_user_id'))`
  );
  schemaHas154 = Number((rows as RowDataPacket[])[0]?.present) === 2;
  return schemaHas154;
}

/**
 * Designa al usuario raíz como MU del Universo recién creado (Scenario 8).
 * Debe invocarse con la MISMA conexión transaccional del onboarding (§18.3):
 * Universe + Owner + MU se crean atómicamente — todos o ninguno.
 */
export async function designateMasterOfUniverse(
  connection: PoolConnection,
  params: { tenantId: number; userId: number }
): Promise<MuDesignationResult> {
  const { tenantId, userId } = params;
  if (!(await detectSchema154(connection))) {
    return 'SCHEMA_PRE_154';
  }

  await connection.execute<ResultSetHeader>(
    `UPDATE tenant_user_memberships SET cosmonaut_type = 'MU'
     WHERE user_id = ? AND owner_id = ?`,
    [userId, tenantId]
  );

  // I1 — el ancla solo se escribe si estaba vacía; ancla ocupada = segundo MU
  const [anchor] = await connection.execute<ResultSetHeader>(
    `UPDATE tenants SET mu_user_id = ? WHERE id = ? AND mu_user_id IS NULL`,
    [userId, tenantId]
  );
  if ((anchor as ResultSetHeader).affectedRows !== 1) {
    throw new MuAlreadyDesignatedError(tenantId);
  }

  return 'MU_DESIGNATED';
}
