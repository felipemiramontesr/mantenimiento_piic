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
      isSuiteVIM: (): boolean => false,
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
      isSuiteVIM: (): boolean => false,
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
});
