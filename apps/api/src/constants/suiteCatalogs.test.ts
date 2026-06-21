import { describe, it, expect } from 'vitest';
import {
  isCategoryAllowedForSuite,
  isCategoryExclusiveToSuite,
  SUITE_CATALOG_CATEGORIES,
  SUITE_EXCLUSIVE,
} from './suiteCatalogs';

describe('suiteCatalogs — FC-2 Subfase 2B (BDD)', () => {
  // SCM-1: SPECIALTY es exclusivo de VIM
  it('SCM-1: SPECIALTY está permitida en VIM y prohibida en ERP', () => {
    expect(isCategoryAllowedForSuite('VIM', 'SPECIALTY')).toBe(true);
    expect(isCategoryAllowedForSuite('ERP', 'SPECIALTY')).toBe(false);
  });

  // SCM-2: FLEET_AREA es exclusivo de ERP
  it('SCM-2: FLEET_AREA está permitida en ERP y prohibida en VIM', () => {
    expect(isCategoryAllowedForSuite('ERP', 'FLEET_AREA')).toBe(true);
    expect(isCategoryAllowedForSuite('VIM', 'FLEET_AREA')).toBe(false);
  });

  // SCM-3: categorías compartidas visibles en ambas suites
  it('SCM-3: ASSET_TYPE, BRAND, FUEL_TYPE son válidas en VIM y ERP', () => {
    const shared = ['ASSET_TYPE', 'BRAND', 'FUEL_TYPE', 'TRANSMISSION', 'FLEET_OWNER'];
    shared.forEach((cat) => {
      expect(isCategoryAllowedForSuite('VIM', cat), `VIM debe tener ${cat}`).toBe(true);
      expect(isCategoryAllowedForSuite('ERP', cat), `ERP debe tener ${cat}`).toBe(true);
    });
  });

  // SCM-4: categorías desconocidas rechazadas en cualquier suite
  it('SCM-4: categoría desconocida retorna false para VIM y ERP', () => {
    expect(isCategoryAllowedForSuite('VIM', 'UNKNOWN_CAT')).toBe(false);
    expect(isCategoryAllowedForSuite('ERP', 'UNKNOWN_CAT')).toBe(false);
  });

  // SCM-5: VIM y ERP tienen la misma cantidad de categorías (1 exclusiva + n compartidas cada una)
  it('SCM-5: VIM y ERP tienen el mismo total de categorías mapeadas', () => {
    expect(SUITE_CATALOG_CATEGORIES.VIM.size).toBe(SUITE_CATALOG_CATEGORIES.ERP.size);
  });

  // SCM-6: categorías de mantenimiento compartidas (crítico para módulo de mantenimiento)
  it('SCM-6: categorías de frecuencia de mantenimiento disponibles en ambas suites', () => {
    const maintCats = [
      'MAINT_FREQ_TIME',
      'MAINT_FREQ_USAGE',
      'MAINTENANCE_TIME_FREQ',
      'MAINTENANCE_USAGE_FREQ',
    ];
    maintCats.forEach((cat) => {
      expect(isCategoryAllowedForSuite('VIM', cat), `VIM.${cat}`).toBe(true);
      expect(isCategoryAllowedForSuite('ERP', cat), `ERP.${cat}`).toBe(true);
    });
  });

  // SCM-7: USER_ROLE no es un catálogo de UI — excluido de ambas suites
  it('SCM-7: USER_ROLE no es una categoría de catálogo de UI', () => {
    expect(isCategoryAllowedForSuite('VIM', 'USER_ROLE')).toBe(false);
    expect(isCategoryAllowedForSuite('ERP', 'USER_ROLE')).toBe(false);
  });

  // SCM-8: SUITE_EXCLUSIVE contiene solo las categorías verdaderamente exclusivas
  it('SCM-8: SUITE_EXCLUSIVE.VIM contiene únicamente SPECIALTY', () => {
    expect(SUITE_EXCLUSIVE.VIM.has('SPECIALTY')).toBe(true);
    expect(SUITE_EXCLUSIVE.VIM.has('FLEET_AREA')).toBe(false);
    expect(SUITE_EXCLUSIVE.VIM.size).toBe(1);
  });

  it('SCM-9: SUITE_EXCLUSIVE.ERP contiene únicamente FLEET_AREA', () => {
    expect(SUITE_EXCLUSIVE.ERP.has('FLEET_AREA')).toBe(true);
    expect(SUITE_EXCLUSIVE.ERP.has('SPECIALTY')).toBe(false);
    expect(SUITE_EXCLUSIVE.ERP.size).toBe(1);
  });

  it('SCM-10: isCategoryExclusiveToSuite identifica exclusivos correctamente', () => {
    expect(isCategoryExclusiveToSuite('VIM', 'SPECIALTY')).toBe(true);
    expect(isCategoryExclusiveToSuite('ERP', 'FLEET_AREA')).toBe(true);
    expect(isCategoryExclusiveToSuite('VIM', 'FLEET_AREA')).toBe(false);
    expect(isCategoryExclusiveToSuite('ERP', 'SPECIALTY')).toBe(false);
    expect(isCategoryExclusiveToSuite('VIM', 'ASSET_TYPE')).toBe(false);
  });

  it('SCM-11: categorías no mapeadas (ENVIRONMENTAL_HOLOGRAM) no son exclusivas de ningún suite', () => {
    expect(isCategoryExclusiveToSuite('VIM', 'ENVIRONMENTAL_HOLOGRAM')).toBe(false);
    expect(isCategoryExclusiveToSuite('ERP', 'ENVIRONMENTAL_HOLOGRAM')).toBe(false);
  });

  // Gherkin BDD scenarios from FC-2
  describe('Gherkin: Suite isolation invariant', () => {
    it('Given owner.suite=VIM, When category=SPECIALTY, Then isCategoryAllowed=true', () => {
      expect(isCategoryAllowedForSuite('VIM', 'SPECIALTY')).toBe(true);
    });

    it('Given owner.suite=ERP, When category=SPECIALTY, Then isCategoryAllowed=false (cross-suite blocked)', () => {
      expect(isCategoryAllowedForSuite('ERP', 'SPECIALTY')).toBe(false);
    });

    it('Given owner.suite=VIM, When category=FLEET_AREA, Then isCategoryAllowed=false (cross-suite blocked)', () => {
      expect(isCategoryAllowedForSuite('VIM', 'FLEET_AREA')).toBe(false);
    });

    it('Given owner.suite=ERP, When category=FLEET_AREA, Then isCategoryAllowed=true', () => {
      expect(isCategoryAllowedForSuite('ERP', 'FLEET_AREA')).toBe(true);
    });
  });
});
