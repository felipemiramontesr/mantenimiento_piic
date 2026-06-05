import { describe, it, expect } from 'vitest';
import { AlertTriangle } from 'lucide-react';
import { render, screen } from '../../../test/testUtils';
import {
  formatMXN,
  formatDate,
  formatDateTime,
  formatKm,
  formatNum,
  formatHours,
  formatPct,
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  NodeBackLink,
  MOVEMENT_STATUS_BADGE,
  MOVEMENT_STATUS_LABEL,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
  INCIDENT_CATEGORY_LABEL,
} from './NodeShared';

// ─── Formatters ───────────────────────────────────────────────────────────────

describe('NodeShared formatters', () => {
  describe('formatMXN', () => {
    it('formats positive number as MXN currency', () => {
      expect(formatMXN(1500)).toContain('1');
      expect(formatMXN(1500)).toContain('500');
    });
    it('returns em dash for null', () => {
      expect(formatMXN(null)).toBe('—');
    });
    it('returns em dash for undefined', () => {
      expect(formatMXN(undefined)).toBe('—');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date string in es-MX locale', () => {
      const result = formatDate('2026-06-01T10:00:00.000Z');
      expect(result).toMatch(/\d/);
    });
    it('returns em dash for null', () => {
      expect(formatDate(null)).toBe('—');
    });
    it('returns em dash for empty string', () => {
      expect(formatDate('')).toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO datetime string', () => {
      const result = formatDateTime('2026-06-01T10:00:00.000Z');
      expect(result).toMatch(/\d/);
    });
    it('returns em dash for null', () => {
      expect(formatDateTime(null)).toBe('—');
    });
  });

  describe('formatKm', () => {
    it('formats number with km suffix', () => {
      expect(formatKm(50000)).toContain('km');
      expect(formatKm(50000)).toContain('50');
    });
    it('returns em dash for null', () => {
      expect(formatKm(null)).toBe('—');
    });
    it('returns em dash for undefined', () => {
      expect(formatKm(undefined)).toBe('—');
    });
  });

  describe('formatNum', () => {
    it('formats number with unit', () => {
      expect(formatNum(40, 'L', 2)).toContain('L');
      expect(formatNum(40, 'L', 2)).toContain('40');
    });
    it('returns em dash for null', () => {
      expect(formatNum(null, 'L')).toBe('—');
    });
  });

  describe('formatHours', () => {
    it('formats hours with h suffix', () => {
      expect(formatHours(720)).toContain('h');
    });
    it('returns em dash for zero/falsy', () => {
      expect(formatHours(0)).toBe('—');
      expect(formatHours(null)).toBe('—');
    });
  });

  describe('formatPct', () => {
    it('formats percentage with % symbol', () => {
      expect(formatPct(75)).toContain('%');
      expect(formatPct(75)).toContain('75');
    });
    it('returns em dash for null', () => {
      expect(formatPct(null)).toBe('—');
    });
    it('returns em dash for undefined', () => {
      expect(formatPct(undefined)).toBe('—');
    });
  });
});

// ─── Status Maps ─────────────────────────────────────────────────────────────

describe('NodeShared status maps', () => {
  it('MOVEMENT_STATUS_BADGE has entries for all statuses', () => {
    expect(MOVEMENT_STATUS_BADGE.COMPLETED).toContain('emerald');
    expect(MOVEMENT_STATUS_BADGE.ACTIVE).toContain('blue');
    expect(MOVEMENT_STATUS_BADGE.CANCELLED).toContain('slate');
  });

  it('MOVEMENT_STATUS_LABEL maps correctly', () => {
    expect(MOVEMENT_STATUS_LABEL.COMPLETED).toBe('Completado');
    expect(MOVEMENT_STATUS_LABEL.ACTIVE).toBe('Activo');
  });

  it('SEVERITY_BADGE has entries for all levels', () => {
    expect(SEVERITY_BADGE.CRITICAL).toContain('red');
    expect(SEVERITY_BADGE.LOW).toContain('blue');
  });

  it('SEVERITY_LABEL maps correctly', () => {
    expect(SEVERITY_LABEL.CRITICAL).toBe('Crítico');
    expect(SEVERITY_LABEL.LOW).toBe('Bajo');
  });

  it('INCIDENT_CATEGORY_LABEL maps correctly', () => {
    expect(INCIDENT_CATEGORY_LABEL.MECANICA).toBe('Mecánica');
    expect(INCIDENT_CATEGORY_LABEL.SINIESTRO).toBe('Siniestro');
  });
});

// ─── UI Primitives ────────────────────────────────────────────────────────────

describe('NodeShared UI components', () => {
  it('InfoRow renders label and value', () => {
    render(<InfoRow label="Técnico" value="Carlos López" />);
    expect(screen.getByText('Técnico')).toBeInTheDocument();
    expect(screen.getByText('Carlos López')).toBeInTheDocument();
  });

  it('InfoRow renders em dash when value is null', () => {
    render(<InfoRow label="Técnico" value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('SectionCard renders title and children', () => {
    render(
      <SectionCard title="Mi Sección" icon={<AlertTriangle size={16} />}>
        <span>Contenido</span>
      </SectionCard>
    );
    expect(screen.getByText('Mi Sección')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('NodeLoadingState renders loading indicator', () => {
    render(<NodeLoadingState />);
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });

  it('NodeErrorState renders error message and back link', () => {
    render(<NodeErrorState error="Error de prueba" backTo="/dashboard/fleet" backLabel="Flota" />);
    expect(screen.getByText('Error de prueba')).toBeInTheDocument();
    expect(screen.getByText('Flota')).toBeInTheDocument();
  });

  it('NodeErrorState renders fallback message when error is null', () => {
    render(<NodeErrorState error={null} backTo="/dashboard/fleet" backLabel="Flota" />);
    expect(screen.getByText(/Registro no encontrado/i)).toBeInTheDocument();
  });

  it('NodeBackLink renders as link with correct href', () => {
    render(<NodeBackLink to="/dashboard/maintenance" label="Mantenimiento" />);
    const link = screen.getByRole('link', { name: /Mantenimiento/i });
    expect(link.getAttribute('href')).toBe('/dashboard/maintenance');
  });
});
