import { assetTypesResponseSchema, AssetTypeEntry } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useAssetTypeFields.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getAssetTypesWithFields(): Promise<AssetTypeEntry[]> {
  const res = await api.get('/catalogs/asset-types');
  return assetTypesResponseSchema.parse(res.data).data;
}
