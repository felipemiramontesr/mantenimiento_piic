import { describe, it, expect } from 'vitest';
import { SUPERCUMULOS, UNIT_IDS } from './seedSupercumulosPiic';
import EncryptionService from '../services/encryption';

// ─── VIM_PIIC_Supercumulos_Seed — Tests (FC: VIM_PIIC_Supercumulos_Seed) ────
// SC1: 3 PRIVATE owners · SC2: profiles+links · SC3: dist 1-2-3
// SC4: AES cifrado + blind index · SC5: IDs únicos (idempotency data layer)

describe('VIM_PIIC_Supercumulos_Seed — Data Integrity', () => {
  it('SC1: define exactamente 3 Supercúmulos', () => {
    expect(SUPERCUMULOS).toHaveLength(3);
  });

  it('SC3: distribución de fleet_units es [1, 2, 3]', () => {
    const dist = SUPERCUMULOS.map((sc) => sc.units.length).sort((a, b) => a - b);
    expect(dist).toEqual([1, 2, 3]);
  });

  it('total de fleet_units definidas = 6', () => {
    const total = SUPERCUMULOS.reduce((acc, sc) => acc + sc.units.length, 0);
    expect(total).toBe(6);
  });

  it('UNIT_IDS tiene 6 entradas únicas con formato PIIC-NNN', () => {
    expect(UNIT_IDS).toHaveLength(6);
    expect(new Set(UNIT_IDS).size).toBe(6);
    UNIT_IDS.forEach((id) => {
      expect(id).toMatch(/^PIIC-\d{3}$/);
    });
  });

  it('IDs en SUPERCUMULOS coinciden 1:1 con UNIT_IDS', () => {
    const allIds = SUPERCUMULOS.flatMap((sc) => sc.units.map((u) => u.id));
    expect([...allIds].sort()).toEqual([...UNIT_IDS].sort());
  });
});

describe('VIM_PIIC_Supercumulos_Seed — Owner Profiles', () => {
  it('RFCs tienen formato válido (12-13 chars alfanumérico mayúsculas)', () => {
    SUPERCUMULOS.forEach((sc) => {
      expect(sc.rfc).toMatch(/^[A-Z0-9]{12,13}$/);
    });
  });

  it('RFCs son únicos entre los 3 Supercúmulos', () => {
    const rfcs = SUPERCUMULOS.map((sc) => sc.rfc);
    expect(new Set(rfcs).size).toBe(3);
  });

  it('neighborhoodIds corresponden a colonias de Hermosillo (260301-260305)', () => {
    SUPERCUMULOS.forEach((sc) => {
      expect(sc.neighborhoodId).toBeGreaterThanOrEqual(260301);
      expect(sc.neighborhoodId).toBeLessThanOrEqual(260305);
    });
  });

  it('labels y razonSocial no están vacíos', () => {
    SUPERCUMULOS.forEach((sc) => {
      expect(sc.label.trim().length).toBeGreaterThan(0);
      expect(sc.razonSocial.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('VIM_PIIC_Supercumulos_Seed — Fleet Unit Catalogs', () => {
  it('fuelTypeId es 10 (Diésel) o 11 (Gasolina) — §9.4', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        expect([10, 11]).toContain(u.fuelTypeId);
      });
    });
  });

  it('transmisionId es 30 (Automática) o 31 (Manual)', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        expect([30, 31]).toContain(u.transmisionId);
      });
    });
  });

  it('años de fabricación están en rango válido 2017-2026', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        expect(u.year).toBeGreaterThanOrEqual(2017);
        expect(u.year).toBeLessThanOrEqual(2026);
      });
    });
  });

  it('odómetros son positivos y realistas (>0, <500,000 km)', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        expect(u.odometer).toBeGreaterThan(0);
        expect(u.odometer).toBeLessThan(500_000);
      });
    });
  });

  it('tireSpec tiene formato de llanta válido (PxNN/NNRNN o LT)', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        expect(u.tireSpec).toMatch(/^(P|LT)\d{3}\/\d{2}R\d{2}$/);
      });
    });
  });

  it('SC5: IDs de fleet_units son únicos entre todos los Supercúmulos', () => {
    const allIds = SUPERCUMULOS.flatMap((sc) => sc.units.map((u) => u.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('VIM_PIIC_Supercumulos_Seed — AES Encryption (SC4 §2.2)', () => {
  it('placasRaw no se almacena en texto plano — cifrado AES-256-GCM', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        const enc = EncryptionService.encrypt(u.placasRaw);
        expect(enc).not.toBe(u.placasRaw);
        expect(enc.split(':')).toHaveLength(3); // iv:tag:ciphertext
      });
    });
  });

  it('numeroSerieRaw se cifra y descifra sin pérdida', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        const enc = EncryptionService.encrypt(u.numeroSerieRaw);
        const dec = EncryptionService.decrypt(enc);
        expect(dec).toBe(u.numeroSerieRaw);
        expect(enc).not.toContain(u.numeroSerieRaw);
      });
    });
  });

  it('circulationRaw se cifra y descifra sin pérdida', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        const enc = EncryptionService.encrypt(u.circulationRaw);
        expect(EncryptionService.decrypt(enc)).toBe(u.circulationRaw);
      });
    });
  });

  it('blind index (placasHash) tiene formato SVR-XXXXXXXXXXXXXXXX y es determinístico', () => {
    SUPERCUMULOS.forEach((sc) => {
      sc.units.forEach((u) => {
        const h1 = EncryptionService.generateBlindIndex(u.placasRaw);
        const h2 = EncryptionService.generateBlindIndex(u.placasRaw);
        expect(h1).toBe(h2);
        expect(h1).toMatch(/^SVR-[0-9A-F]{16}$/);
        expect(h1).toHaveLength(20);
        expect(h1).not.toBe(u.placasRaw);
      });
    });
  });

  it('blind index varía entre placas distintas', () => {
    const hashes = SUPERCUMULOS.flatMap((sc) =>
      sc.units.map((u) => EncryptionService.generateBlindIndex(u.placasRaw))
    );
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('cifrados de placas iguales son diferentes (IV aleatorio — no determinístico)', () => {
    const enc1 = EncryptionService.encrypt('SNA-123-X');
    const enc2 = EncryptionService.encrypt('SNA-123-X');
    expect(enc1).not.toBe(enc2);
  });
});
