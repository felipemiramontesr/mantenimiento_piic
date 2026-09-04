import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuditSection } from './AuditSection';

/**
 * FC165 F2 Slice 2.3A — AuditSection.tsx had no dedicated test file. Only
 * exercised indirectly via FleetRegistrationForm.test.tsx, where
 * isPronosticoReady never turns true, leaving the entire "ready" visual
 * state (navy-filled card, yellow pulsing icon, date+label layout) uncovered.
 */

describe('AuditSection', () => {
  it('shows the muted not-ready state with only the pronostico text', () => {
    render(
      <AuditSection
        pronosticoText="Sin datos suficientes para pronosticar"
        pronosticoDateStr=""
        isPronosticoReady={false}
      />
    );
    expect(screen.getByText('Sin datos suficientes para pronosticar')).toBeInTheDocument();
  });

  it('shows the ready state with the forecast date and label', () => {
    render(
      <AuditSection
        pronosticoText="Próximo mantenimiento"
        pronosticoDateStr="15 / 10 / 2026"
        isPronosticoReady
      />
    );
    expect(screen.getByText('15 / 10 / 2026')).toBeInTheDocument();
    expect(screen.getByText('Próximo mantenimiento')).toBeInTheDocument();
  });
});
