// ⚡ ARCHON FLEET CONSTANTS (v.16.3.0)
// Centralized Asset Intelligence catalogs
//
// FC094 F0 (2026-08-03): removed 13 unused catalog constants (dropdown option
// lists superseded by the DB-backed common_catalogs migration in FC082) —
// evidence: protocols/analysis/094_evidence/f0/dead_code_inventory.md.

export const DEPARTAMENTOS = [
  'Administración',
  'Exploración',
  'Geología',
  'Laboratorio',
  'Mantenimiento Eléctrico',
  'Mantenimiento Planta',
  'Medio Ambiente',
  'Operación Mina',
  'Operación Planta',
  'Planeación',
  'Relaciones Comunitarias',
  'Seguridad Patrimonial',
  'Seguridad Industrial',
] as const;

// 🔱 Archon Catalog Mappings (Sovereign Grid)
export const ASSET_TYPE_MAP: Record<number, string> = {
  1: 'Vehiculo',
  2: 'Maquinaria',
  3: 'Herramienta',
};

export const FUEL_TYPE_MAP: Record<number, string> = {
  10: 'Diésel',
  11: 'Gasolina',
  12: 'Eléctrico',
  219: 'Mezcla 2T',
  1040: 'Gas LP',
};

export const DEPT_MAP: Record<number, string> = {
  222: 'Administración',
  223: 'Exploración',
  224: 'Geología',
  225: 'Laboratorio',
  226: 'Mant. Eléctrico',
  227: 'Mant. Planta',
  228: 'Medio Ambiente',
  229: 'Operación Mina',
  230: 'Operación Planta',
};

export const ENGINE_MAP: Record<number, string> = {
  1024: 'L4 2.8L Turbo',
  1026: 'L4 2.5L DOHC',
  1027: 'V8 6.4L HEMI',
  1028: 'L4 2.4L MIVEC',
  1029: 'L4 2.0L CTI',
  1030: 'L4 1.4L TSI',
};
