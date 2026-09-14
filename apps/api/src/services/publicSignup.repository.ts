import { Pool, PoolConnection } from 'mysql2/promise';
import { ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form. SQL boundary for the one write this phase
 * introduces beyond `users` (already covered by `cosmology.repository.ts`'s `insertSeedUser`,
 * reused here rather than duplicated): the CFDI 4.0 fiscal snapshot captured at signup, before
 * any tenant exists to attach it to (migración 174).
 */
type Executor = Pool | PoolConnection;

export interface BillingProfileInput {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostalFiscal: string;
  usoCfdi: string;
  telefono?: string;
}

/** F2-I2 — one row per `user_id` (PK), inserted in the same TX as the `users` row it belongs to. */
export async function insertBillingProfile(
  userId: number,
  data: BillingProfileInput,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO user_billing_profiles
       (user_id, rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, uso_cfdi, telefono)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.rfc,
      data.razonSocial,
      data.regimenFiscal,
      data.codigoPostalFiscal,
      data.usoCfdi,
      data.telefono ?? null,
    ]
  );
}
