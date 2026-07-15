import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArchonDoctor } from './ArchonDoctor';

/**
 * FC 074 F2 — Navegación Soberana Móvil.
 * Cobertura mínima y acotada al hallazgo de F1 (074_AN): el badge
 * "ARCHON DOCTOR" medía 213×30 (altura <44px) en las 54 celdas auditadas.
 * No amplía cobertura del resto del componente (fuera de scope de FC 074).
 */
describe('ArchonDoctor — FC 074 F2 touch-target', () => {
  it('AT-FC074-F2-AD-1: el badge cerrado usa min-h-11 (44px) en vez de py-2 (~30px)', () => {
    render(<ArchonDoctor />);
    const badge = screen.getByRole('button', { name: /ARCHON DOCTOR/i });
    expect(badge.className).toMatch(/\bmin-h-11\b/);
  });
});
