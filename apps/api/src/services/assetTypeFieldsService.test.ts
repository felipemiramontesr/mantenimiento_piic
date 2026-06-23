import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from './db';
import { getAssetTypes, getFieldVisibility } from './assetTypeFieldsService';

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));

describe('assetTypeFieldsService — FC-AssetType_ConditionalFields FaseA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AT-A-1 — getAssetTypes returns 4 types with VEHICLE first ───────────────
  describe('AT-A-1 — getAssetTypes', () => {
    it('returns 4 asset types, VEHICLE first', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [
          { id: 1, code: 'VEHICLE', label: 'Vehículo', icon_name: 'truck' },
          { id: 2, code: 'MOTORCYCLE', label: 'Motocicleta', icon_name: 'motorcycle' },
          { id: 3, code: 'EQUIPMENT', label: 'Equipo', icon_name: 'cog' },
          { id: 4, code: 'TRAILER', label: 'Remolque', icon_name: 'trailer' },
        ],
      ]);

      const types = await getAssetTypes();

      expect(types).toHaveLength(4);
      expect(types[0].code).toBe('VEHICLE');
      expect(types[2].code).toBe('EQUIPMENT');
      expect(types[3].icon_name).toBe('trailer');
    });
  });

  // ── AT-A-2 — EQUIPMENT hides placa + circulationCardNumber + 3 more ─────────
  describe('AT-A-2 — getFieldVisibility(3) — EQUIPMENT', () => {
    it('placa and circulationCardNumber are false; numeroSerie is true', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [
          { field_name: 'placa', visible: 0 },
          { field_name: 'circulationCardNumber', visible: 0 },
          { field_name: 'insurancePolicyNumber', visible: 0 },
          { field_name: 'insuranceExpiryDate', visible: 0 },
          { field_name: 'vencimientoVerificacion', visible: 0 },
        ],
      ]);

      const vis = await getFieldVisibility(3);

      expect(vis.placa).toBe(false);
      expect(vis.circulationCardNumber).toBe(false);
      expect(vis.insurancePolicyNumber).toBe(false);
      expect(vis.insuranceExpiryDate).toBe(false);
      expect(vis.vencimientoVerificacion).toBe(false);
      expect(vis.numeroSerie).toBe(true);
      expect(vis.warrantyExpiry).toBe(true);
    });
  });

  // ── AT-A-3 — VEHICLE shows all fields (no hidden rows in DB) ────────────────
  describe('AT-A-3 — getFieldVisibility(1) — VEHICLE', () => {
    it('all VEHICLE_FIELDS are true when no hidden rows returned', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [
          /* no hidden rows */
        ],
      ]);

      const vis = await getFieldVisibility(1);

      expect(vis.placa).toBe(true);
      expect(vis.circulationCardNumber).toBe(true);
      expect(vis.numeroSerie).toBe(true);
      expect(vis.insurancePolicyNumber).toBe(true);
      expect(vis.insuranceExpiryDate).toBe(true);
      expect(vis.vencimientoVerificacion).toBe(true);
      expect(vis.warrantyExpiry).toBe(true);
    });
  });

  // ── AT-A-4 — MOTORCYCLE hides only circulationCardNumber ────────────────────
  describe('AT-A-4 — getFieldVisibility(2) — MOTORCYCLE', () => {
    it('placa=true, circulationCardNumber=false', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [{ field_name: 'circulationCardNumber', visible: 0 }],
      ]);

      const vis = await getFieldVisibility(2);

      expect(vis.placa).toBe(true);
      expect(vis.circulationCardNumber).toBe(false);
      expect(vis.numeroSerie).toBe(true);
      expect(vis.warrantyExpiry).toBe(true);
    });
  });

  // ── AT-A-5 — TRAILER hides placa + circulationCardNumber + vencimientoVerificacion
  describe('AT-A-5 — getFieldVisibility(4) — TRAILER', () => {
    it('placa=false, insurancePolicyNumber=true', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [
          { field_name: 'placa', visible: 0 },
          { field_name: 'circulationCardNumber', visible: 0 },
          { field_name: 'vencimientoVerificacion', visible: 0 },
        ],
      ]);

      const vis = await getFieldVisibility(4);

      expect(vis.placa).toBe(false);
      expect(vis.circulationCardNumber).toBe(false);
      expect(vis.vencimientoVerificacion).toBe(false);
      expect(vis.insurancePolicyNumber).toBe(true);
      expect(vis.insuranceExpiryDate).toBe(true);
    });
  });

  // ── AT-A-6 — DB query uses assetTypeId param correctly ──────────────────────
  describe('AT-A-6 — query param validation', () => {
    it('passes assetTypeId=3 as SQL param', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        [{ field_name: 'placa', visible: 0 }],
      ]);

      await getFieldVisibility(3);

      expect(vi.mocked(db.execute)).toHaveBeenCalledWith(
        expect.stringContaining('asset_type_id = ?'),
        [3]
      );
    });
  });
});
