import { describe, it, expect } from 'vitest';
import { buildCsv, isRemoteExportAllowed, PII_MASK, type CsvColumn } from './exportUtils';

/**
 * 🔱 FC 041 Fase E — Sistema_Exportacion_Segura (lado cliente)
 * T1 RemoteExportEnabled (4 filas) + buildCsv puro sin red con política PII
 * de archivo (cond.1 Bravo): los campos §8.1 se enmascaran SIEMPRE, aunque el
 * dataset traiga valores legibles (superficie archivo ≠ superficie UI).
 */

const COLUMNS: CsvColumn[] = [
  { key: 'unit_id', label: 'Unidad' },
  { key: 'placas', label: 'Placas' },
  { key: 'cost', label: 'Costo' },
];

describe('isRemoteExportAllowed — T1 (4 filas exhaustivas)', () => {
  it('⊤⊤: exportación remota con red → permitida', () => {
    expect(isRemoteExportAllowed(true, true)).toBe(true);
  });
  it('⊤⊥: exportación remota sin red → bloqueada', () => {
    expect(isRemoteExportAllowed(true, false)).toBe(false);
  });
  it('⊥⊤: exportación local con red → permitida', () => {
    expect(isRemoteExportAllowed(false, true)).toBe(true);
  });
  it('⊥⊥: exportación local sin red → permitida (CSV no depende de red)', () => {
    expect(isRemoteExportAllowed(false, false)).toBe(true);
  });
});

describe('buildCsv (FC 041 Fase E)', () => {
  it('builds header from labels and one line per row', () => {
    const csv = buildCsv(
      [
        { unit_id: 'PIIC-101', placas: 'ABC-123', cost: 1500 },
        { unit_id: 'PIIC-201', placas: 'XYZ-999', cost: 800 },
      ],
      COLUMNS
    );
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Unidad,Placas,Costo');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('PIIC-101');
  });

  it('ALWAYS masks PII fields even when readable values arrive (cond.1)', () => {
    const csv = buildCsv([{ unit_id: 'PIIC-101', placas: 'ABC-123', cost: 10 }], COLUMNS);
    expect(csv).not.toContain('ABC-123');
    expect(csv).toContain(PII_MASK);
  });

  it('masks every §8.1 PII key variant (camelCase y snake_case)', () => {
    const piiColumns: CsvColumn[] = [
      { key: 'numeroSerie', label: 'Serie' },
      { key: 'numero_serie', label: 'Serie2' },
      { key: 'circulationCardNumber', label: 'Tarjeta' },
      { key: 'circulation_card_number', label: 'Tarjeta2' },
    ];
    const csv = buildCsv(
      [
        {
          numeroSerie: 'VIN123',
          numero_serie: 'VIN456',
          circulationCardNumber: 'TC-789',
          circulation_card_number: 'TC-000',
        },
      ],
      piiColumns
    );
    ['VIN123', 'VIN456', 'TC-789', 'TC-000'].forEach((raw) => {
      expect(csv).not.toContain(raw);
    });
  });

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = buildCsv([{ unit_id: 'Uno, "Dos"\nTres', placas: null, cost: 0 }], COLUMNS);
    expect(csv).toContain('"Uno, ""Dos""\nTres"');
  });

  it('renders null/undefined as empty cells and returns header-only for empty rows', () => {
    const csv = buildCsv([{ unit_id: null, placas: undefined, cost: undefined }], COLUMNS);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe(`,${PII_MASK},`);
    expect(buildCsv([], COLUMNS)).toBe('Unidad,Placas,Costo');
  });
});
