import { describe, it, expect } from 'vitest';
import { isCategoryBlockedForSuite, filterAllowedCategories } from './suiteCatalogs';

describe('suiteCatalogs — Frontend Suite Gate (FC-2 Subfase 2D)', () => {
  // FE-SC-1: SPECIALTY bloqueado para ERP
  it('FE-SC-1: SPECIALTY is blocked for ERP suite', () => {
    expect(isCategoryBlockedForSuite('ERP', 'SPECIALTY')).toBe(true);
  });

  // FE-SC-2: SPECIALTY no bloqueado para VIM
  it('FE-SC-2: SPECIALTY is not blocked for VIM suite', () => {
    expect(isCategoryBlockedForSuite('VIM', 'SPECIALTY')).toBe(false);
  });

  // FE-SC-3: FLEET_AREA bloqueado para VIM
  it('FE-SC-3: FLEET_AREA is blocked for VIM suite', () => {
    expect(isCategoryBlockedForSuite('VIM', 'FLEET_AREA')).toBe(true);
  });

  // FE-SC-4: FLEET_AREA no bloqueado para ERP
  it('FE-SC-4: FLEET_AREA is not blocked for ERP suite', () => {
    expect(isCategoryBlockedForSuite('ERP', 'FLEET_AREA')).toBe(false);
  });

  // FE-SC-5: categorías compartidas no bloqueadas en ningún suite
  it('FE-SC-5: shared categories are not blocked for any suite', () => {
    const shared = ['ASSET_TYPE', 'BRAND', 'FUEL_TYPE', 'TRANSMISSION', 'MAINTENANCE_CENTER'];
    shared.forEach((cat) => {
      expect(isCategoryBlockedForSuite('VIM', cat), `VIM.${cat}`).toBe(false);
      expect(isCategoryBlockedForSuite('ERP', cat), `ERP.${cat}`).toBe(false);
    });
  });

  // FE-SC-6: categorías no mapeadas (ENVIRONMENTAL_HOLOGRAM) pasan sin bloqueo
  it('FE-SC-6: unmapped categories pass through for both suites', () => {
    expect(isCategoryBlockedForSuite('VIM', 'ENVIRONMENTAL_HOLOGRAM')).toBe(false);
    expect(isCategoryBlockedForSuite('ERP', 'ENVIRONMENTAL_HOLOGRAM')).toBe(false);
  });

  // FE-SC-7: filterAllowedCategories elimina exclusivos del otro suite
  it('FE-SC-7: filterAllowedCategories removes cross-suite exclusives for VIM', () => {
    const cats = ['SPECIALTY', 'ASSET_TYPE', 'FLEET_AREA', 'BRAND'];
    const result = filterAllowedCategories('VIM', cats);
    expect(result).toContain('SPECIALTY');
    expect(result).toContain('ASSET_TYPE');
    expect(result).toContain('BRAND');
    expect(result).not.toContain('FLEET_AREA');
  });

  it('FE-SC-7b: filterAllowedCategories removes cross-suite exclusives for ERP', () => {
    const cats = ['SPECIALTY', 'ASSET_TYPE', 'FLEET_AREA', 'BRAND'];
    const result = filterAllowedCategories('ERP', cats);
    expect(result).toContain('FLEET_AREA');
    expect(result).toContain('ASSET_TYPE');
    expect(result).toContain('BRAND');
    expect(result).not.toContain('SPECIALTY');
  });

  // Gherkin BDD scenarios from FC-2 2D
  describe('Gherkin: Frontend suite gate invariant', () => {
    it('Given suite=ERP, When category=SPECIALTY, Then isCategoryBlockedForSuite=true', () => {
      expect(isCategoryBlockedForSuite('ERP', 'SPECIALTY')).toBe(true);
    });

    it('Given suite=VIM, When category=FLEET_AREA, Then isCategoryBlockedForSuite=true', () => {
      expect(isCategoryBlockedForSuite('VIM', 'FLEET_AREA')).toBe(true);
    });

    it('Given suite=VIM, When category=SPECIALTY, Then isCategoryBlockedForSuite=false', () => {
      expect(isCategoryBlockedForSuite('VIM', 'SPECIALTY')).toBe(false);
    });

    it('Given suite=ERP, When category=ASSET_TYPE, Then isCategoryBlockedForSuite=false', () => {
      expect(isCategoryBlockedForSuite('ERP', 'ASSET_TYPE')).toBe(false);
    });
  });
});
