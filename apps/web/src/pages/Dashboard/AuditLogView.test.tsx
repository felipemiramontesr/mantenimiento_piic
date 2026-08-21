import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import AuditLogView from './AuditLogView';
import api from '../../api/client';

/**
 * AuditLogView — FC Archon_Security_AuditLog Fase 3
 *
 * F3-1: Loading skeleton visible en montaje
 * F3-2: Tabla con datos — una fila por entrada
 * F3-3: Fila expandible muestra diff snapshot
 * F3-4: Estado vacío cuando data=[]
 * F3-5: Estado error cuando API falla
 * F3-6: Columna Universo solo visible para Archon
 */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

const usePermissionsMock = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

const MOCK_ROW = {
  uuid: 'audit-uuid-001',
  entity_type: 'fleet_unit',
  entity_id: '42',
  action: 'UPDATE',
  reason: 'Odómetro actualizado',
  snapshot_before: { status: 'Disponible', odometer: 40000 },
  snapshot_after: { status: 'En Ruta', odometer: 40500 },
  created_at: '2026-06-19T01:00:00.000Z',
  owner_id: 5,
  actor_username: 'piic.root',
  actor_full_name: 'PIIC Root',
  universe_label: 'PIIC SA de CV',
};

const MOCK_RESPONSE = {
  data: {
    success: true,
    data: [MOCK_ROW],
    meta: { page: 1, limit: 20, total: 1 },
  },
};

const EMPTY_RESPONSE = {
  data: {
    success: true,
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  },
};

describe('AuditLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => true,
      hasAnyPermission: (): boolean => true,
      isOmnipotent: (): boolean => false,
    });
  });

  it('F3-1: muestra skeleton de carga al montar', () => {
    // API never resolves → loading persists
    const neverResolve = vi.fn();
    vi.mocked(api.get).mockReturnValue(new Promise(neverResolve));
    render(<AuditLogView />);
    expect(screen.getByTestId('audit-log-loading')).toBeTruthy();
  });

  it('F3-2: tabla visible con una fila por entrada', async () => {
    vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());
    expect(screen.getByTestId('audit-row-audit-uuid-001')).toBeTruthy();
  });

  it('F3-3: click en fila expande el panel de diff', async () => {
    vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-row-audit-uuid-001')).toBeTruthy());

    fireEvent.click(screen.getByTestId('audit-row-audit-uuid-001'));
    expect(screen.getByTestId('audit-diff-audit-uuid-001')).toBeTruthy();
  });

  it('F3-4: mensaje vacío cuando data=[]', async () => {
    vi.mocked(api.get).mockResolvedValue(EMPTY_RESPONSE);
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-log-empty')).toBeTruthy());
  });

  it('F3-5: mensaje de error cuando API falla', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-log-error')).toBeTruthy());
  });

  it('F3-6: columna Universo NO visible para usuario no-Archon', async () => {
    vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());
    expect(screen.queryByTestId('col-universo')).toBeNull();
  });

  it('F3-6b: columna Universo visible para Archon (omnipotente)', async () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => true,
      hasAnyPermission: (): boolean => true,
      isOmnipotent: (): boolean => true,
    });
    vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
    render(<AuditLogView />);
    await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());
    expect(screen.getByTestId('col-universo')).toBeTruthy();
    expect(screen.getByText('PIIC SA de CV')).toBeTruthy();
  });

  // ── FC 078 F3 — migración a la primitiva ArchonDataTable ──
  describe('AT-FC078-F3-AL — contrato responsive de la primitiva', () => {
    it('AT-FC078-F3-AL-1: la tabla vive en SovereignScrollArea con minWidth derivado', async () => {
      vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());
      expect(screen.getByTestId('audit-log-table-scroll-viewport').className).toContain(
        'overflow-x-auto'
      );
      // 6 columnas no-omnipotente → fallback 6×96 (una declara px pero no todas)
      expect(screen.getByTestId('audit-log-table').style.minWidth).toBe(`${6 * 96}px`);
    });

    it('AT-FC078-F3-AL-2 (P2-2): la celda Razón truncable expone title', async () => {
      vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-row-audit-uuid-001')).toBeTruthy());
      const reasonCell = screen.getByText('Odómetro actualizado');
      expect(reasonCell.getAttribute('title')).toBe('Odómetro actualizado');
    });
  });

  // ── R4-C Fc162 — Sonar unc lines 79,83,85,167,168,203,219,236,247,360,361,391,399 ──
  describe('R4-C — filtros, paginación, toggle de diff y estado vacío de snapshot', () => {
    it('editar los 4 filtros y pulsar Aplicar Filtros reinicia a página 1 y re-consulta', async () => {
      vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());

      fireEvent.change(screen.getByTestId('filter-entity-type'), {
        target: { value: 'fleet_unit' },
      });
      fireEvent.change(screen.getByTestId('filter-action'), { target: { value: 'UPDATE' } });
      fireEvent.change(screen.getByTestId('filter-date-from'), {
        target: { value: '2026-06-01' },
      });
      fireEvent.change(screen.getByTestId('filter-date-to'), { target: { value: '2026-06-30' } });

      fireEvent.click(screen.getByTestId('filter-apply'));

      await waitFor(() => {
        const lastCallUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
        expect(lastCallUrl).toContain('page=1');
        expect(lastCallUrl).toContain('entity_type=fleet_unit');
        expect(lastCallUrl).toContain('action=UPDATE');
        expect(lastCallUrl).toContain('date_from=2026-06-01');
        expect(lastCallUrl).toContain('date_to=2026-06-30');
      });
    });

    it('los botones de paginación cambian de página y re-consultan', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [MOCK_ROW], meta: { page: 1, limit: 20, total: 40 } },
      });
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-log-table')).toBeTruthy());

      fireEvent.click(screen.getByTestId('pagination-next'));
      await waitFor(() => {
        const lastCallUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
        expect(lastCallUrl).toContain('page=2');
      });

      fireEvent.click(screen.getByTestId('pagination-prev'));
      await waitFor(() => {
        const lastCallUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
        expect(lastCallUrl).toContain('page=1');
      });
    });

    it('alternar "Solo diferencias" filtra el diff a solo las llaves que cambiaron', async () => {
      const mixedRow = {
        ...MOCK_ROW,
        uuid: 'audit-uuid-003',
        snapshot_before: { status: 'Disponible', unchanged: 'same' },
        snapshot_after: { status: 'En Ruta', unchanged: 'same' },
      };
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [mixedRow], meta: { page: 1, limit: 20, total: 1 } },
      });
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-row-audit-uuid-003')).toBeTruthy());
      fireEvent.click(screen.getByTestId('audit-row-audit-uuid-003'));

      expect(screen.getAllByText(/unchanged:/).length).toBeGreaterThan(0);

      fireEvent.click(screen.getByTestId('toggle-only-diffs'));
      expect(screen.getByText('Mostrar todo')).toBeTruthy();
      expect(screen.queryAllByText(/unchanged:/).length).toBe(0);
    });

    it('expandir una fila sin datos de snapshot muestra el mensaje vacío', async () => {
      const nullSnapshotRow = {
        ...MOCK_ROW,
        uuid: 'audit-uuid-002',
        snapshot_before: null,
        snapshot_after: null,
      };
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [nullSnapshotRow], meta: { page: 1, limit: 20, total: 1 } },
      });
      render(<AuditLogView />);
      await waitFor(() => expect(screen.getByTestId('audit-row-audit-uuid-002')).toBeTruthy());
      fireEvent.click(screen.getByTestId('audit-row-audit-uuid-002'));
      expect(screen.getByText('Sin datos de snapshot.')).toBeTruthy();
    });
  });
});
