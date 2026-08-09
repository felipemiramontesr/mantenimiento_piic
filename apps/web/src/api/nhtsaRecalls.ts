import {
  nhtsaSearchResponseSchema,
  nhtsaImportResponseSchema,
  NhtsaRecall,
} from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useNhtsaRecalls.ts` (Cond.R-142-H1). */
export async function searchNhtsaRecalls(
  make: string,
  model: string,
  year: number
): Promise<NhtsaRecall[]> {
  const res = await api.get(
    `/recalls/nhtsa?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
      model
    )}&year=${year}`
  );
  return nhtsaSearchResponseSchema.parse(res.data).data;
}

export type NhtsaImportParams = {
  campaignNumber: string;
  make: string;
  model: string;
  year: number;
  description?: string;
};

/** Imports an NHTSA recall into the local catalog, deduping by campaign code. */
export async function importNhtsaRecall(params: NhtsaImportParams): Promise<{ recall_id: number }> {
  const res = await api.post('/recalls/nhtsa/import', params);
  return { recall_id: nhtsaImportResponseSchema.parse(res.data).recall_id };
}
