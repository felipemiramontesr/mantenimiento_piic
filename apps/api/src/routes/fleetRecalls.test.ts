/* eslint-disable */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { buildRecallItem } from './fleetRecalls';
import type { RecallItem } from './fleetRecalls';

// FR-1..3: GET/POST/PATCH /fleet-units/:unitId/recalls — pure helper unit tests (FC-3 Fase 3D)

const baseRecall: RecallItem = {
  recall_id: 1,
  campaign_code: 'NIS-2021-0047',
  description: 'Falla en módulo airbag conductor — riesgo de despliegue inadvertido',
  make: 'NISSAN',
  model: 'NP300',
  year: 2021,
  published_date: '2021-08-15',
  status: 'PENDING',
  resolved_at: null,
  work_order_id: null,
};

describe('buildRecallItem (FR-1..3)', () => {
  it('FR-1: devuelve shape correcta con todos los campos del catálogo y estado', () => {
    const result = buildRecallItem(baseRecall);
    expect(result.recall_id).toBe(1);
    expect(result.campaign_code).toBe('NIS-2021-0047');
    expect(result.make).toBe('NISSAN');
    expect(result.model).toBe('NP300');
    expect(result.year).toBe(2021);
    expect(result.status).toBe('PENDING');
    expect(result.published_date).toBe('2021-08-15');
  });

  it('FR-2: resolved_at y work_order_id son null cuando no están asignados', () => {
    const result = buildRecallItem(baseRecall);
    expect(result.resolved_at).toBeNull();
    expect(result.work_order_id).toBeNull();
  });

  it('FR-3: recall COMPLETED incluye resolved_at y work_order_id cuando están presentes', () => {
    const completed: RecallItem = {
      ...baseRecall,
      status: 'COMPLETED',
      resolved_at: '2026-06-01',
      work_order_id: 42,
    };
    const result = buildRecallItem(completed);
    expect(result.status).toBe('COMPLETED');
    expect(result.resolved_at).toBe('2026-06-01');
    expect(result.work_order_id).toBe(42);
  });

  it('FR-4: NOT_APPLICABLE mantiene resolved_at null', () => {
    const na: RecallItem = { ...baseRecall, status: 'NOT_APPLICABLE' };
    const result = buildRecallItem(na);
    expect(result.status).toBe('NOT_APPLICABLE');
    expect(result.resolved_at).toBeNull();
  });
});
