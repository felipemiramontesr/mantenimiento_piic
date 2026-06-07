import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UpaWorkspace from './UpaWorkspace';
import { useUpaOrder } from '../../hooks/useUpaOrder';
import type { UseUpaOrderReturn } from '../../hooks/useUpaOrder';
import type { UpaWorkOrderDetail } from '../../types/upa';

vi.mock('../../hooks/useUpaOrder');

const mockTask = {
  taskId: 'triage_dashboard_lights',
  stage: 'triage' as const,
  packageLevel: null,
  description: 'Revisión de luces de tablero',
  status: 'pending' as const,
  evidenceUrls: null,
  evidenceNotes: null,
  completedAt: null,
};

const mockWorkOrder: UpaWorkOrderDetail = {
  id: 1,
  uuid: 'test-uuid-1234',
  vehicleId: 'ASM-001',
  fleetType: 'urban',
  status: 'IN_PROGRESS',
  pendingSince: null,
  openedAt: '2024-01-01T00:00:00.000Z',
  closedAt: null,
  tasks: [mockTask],
};

const baseHook: UseUpaOrderReturn = {
  workOrder: null,
  loading: false,
  error: null,
  initLoading: false,
  taskUpdating: {},
  closingOrder: false,
  startOrder: vi.fn().mockResolvedValue(undefined),
  loadOrder: vi.fn().mockResolvedValue(undefined),
  completeTask: vi.fn().mockResolvedValue(undefined),
  deferTask: vi.fn().mockResolvedValue(undefined),
  closeCurrentOrder: vi.fn().mockResolvedValue(undefined),
  resetOrder: vi.fn(),
};

describe('UpaWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Init Form ──────────────────────────────────────────────────────────────

  describe('Init Form (no work order)', () => {
    it('renders the init form when no work order', () => {
      vi.mocked(useUpaOrder).mockReturnValue(baseHook);
      render(<UpaWorkspace />);
      expect(screen.getByTestId('vehicle-id-input')).toBeDefined();
      expect(screen.getByTestId('init-submit-btn')).toBeDefined();
    });

    it('renders both fleet type radio options', () => {
      vi.mocked(useUpaOrder).mockReturnValue(baseHook);
      render(<UpaWorkspace />);
      expect(screen.getByTestId('fleet-type-urban')).toBeDefined();
      expect(screen.getByTestId('fleet-type-mining')).toBeDefined();
    });

    it('calls startOrder with vehicle id and urban fleet type by default', () => {
      const startOrder = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, startOrder });
      render(<UpaWorkspace />);

      fireEvent.change(screen.getByTestId('vehicle-id-input'), {
        target: { value: 'ASM-001' },
      });
      fireEvent.submit(screen.getByTestId('init-submit-btn').closest('form')!);

      expect(startOrder).toHaveBeenCalledWith('ASM-001', 'urban');
    });

    it('calls startOrder with mining fleet type when selected', () => {
      const startOrder = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, startOrder });
      render(<UpaWorkspace />);

      fireEvent.change(screen.getByTestId('vehicle-id-input'), {
        target: { value: 'MIN-007' },
      });
      fireEvent.click(screen.getByTestId('fleet-type-mining'));
      fireEvent.submit(screen.getByTestId('init-submit-btn').closest('form')!);

      expect(startOrder).toHaveBeenCalledWith('MIN-007', 'mining');
    });

    it('trims whitespace from vehicle id before submit', () => {
      const startOrder = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, startOrder });
      render(<UpaWorkspace />);

      fireEvent.change(screen.getByTestId('vehicle-id-input'), {
        target: { value: '  ASM-001  ' },
      });
      fireEvent.submit(screen.getByTestId('init-submit-btn').closest('form')!);

      expect(startOrder).toHaveBeenCalledWith('ASM-001', 'urban');
    });

    it('shows loading state on submit button', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, initLoading: true });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('init-submit-btn').textContent).toContain('Iniciando');
    });

    it('shows error message when error is set', () => {
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        error: 'Unidad no encontrada. Verifica el ID de la unidad.',
      });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('init-error')).toBeDefined();
    });
  });

  // ─── Active Work Order ──────────────────────────────────────────────────────

  describe('Active Work Order View', () => {
    it('renders stepper when work order is active', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('upa-stepper')).toBeDefined();
    });

    it('renders task card for each task', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('task-card-triage_dashboard_lights')).toBeDefined();
    });

    it('renders defer button for pending task', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('defer-btn-triage_dashboard_lights')).toBeDefined();
    });

    it('renders close order button', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('close-order-btn')).toBeDefined();
    });

    it('calls closeCurrentOrder when close button is clicked', () => {
      const closeCurrentOrder = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: mockWorkOrder,
        closeCurrentOrder,
      });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('close-order-btn'));
      expect(closeCurrentOrder).toHaveBeenCalled();
    });

    it('disables close button while closing', () => {
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: mockWorkOrder,
        closingOrder: true,
      });
      render(<UpaWorkspace />);
      const btn = screen.getByTestId('close-order-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('shows order error banner when error exists on active order', () => {
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: mockWorkOrder,
        error: 'Error al completar la tarea',
      });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('order-error')).toBeDefined();
    });

    // ─── Accordion ─────────────────────────────────────────────────────────────

    it('triage accordion is open by default and shows task card', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('accordion-content-triage')).toBeDefined();
      expect(screen.getByTestId('task-card-triage_dashboard_lights')).toBeDefined();
    });

    it('minor_service accordion is closed by default', () => {
      const minorTask = {
        ...mockTask,
        taskId: 'minor_oil_change',
        stage: 'minor_service' as const,
      };
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: { ...mockWorkOrder, tasks: [mockTask, minorTask] },
      });
      render(<UpaWorkspace />);
      expect(screen.queryByTestId('accordion-content-minor_service')).toBeNull();
      expect(screen.queryByTestId('task-card-minor_oil_change')).toBeNull();
    });

    it('clicking closed accordion toggle opens it', () => {
      const minorTask = {
        ...mockTask,
        taskId: 'minor_oil_change',
        stage: 'minor_service' as const,
      };
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: { ...mockWorkOrder, tasks: [mockTask, minorTask] },
      });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('accordion-toggle-minor_service'));
      expect(screen.getByTestId('accordion-content-minor_service')).toBeDefined();
    });

    it('clicking open accordion toggle closes it', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('accordion-content-triage')).toBeDefined();
      fireEvent.click(screen.getByTestId('accordion-toggle-triage'));
      expect(screen.queryByTestId('accordion-content-triage')).toBeNull();
    });

    it('does not render defer button for completed task', () => {
      const completedTask = { ...mockTask, status: 'completed' as const };
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: { ...mockWorkOrder, tasks: [completedTask] },
      });
      render(<UpaWorkspace />);
      expect(screen.queryByTestId('defer-btn-triage_dashboard_lights')).toBeNull();
    });
  });

  // ─── Defer Modal ────────────────────────────────────────────────────────────

  describe('Defer Modal', () => {
    it('opens defer modal when defer button is clicked', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('defer-btn-triage_dashboard_lights'));
      expect(screen.getByTestId('defer-modal')).toBeDefined();
    });

    it('closes modal when cancel is clicked', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('defer-btn-triage_dashboard_lights'));
      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.queryByTestId('defer-modal')).toBeNull();
    });

    it('calls deferTask with DEFERRED_FINANCIAL when confirmed', () => {
      const deferTask = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: mockWorkOrder,
        deferTask,
      });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('defer-btn-triage_dashboard_lights'));
      fireEvent.click(screen.getByTestId('defer-confirm-btn'));
      expect(deferTask).toHaveBeenCalledWith('triage_dashboard_lights', 'DEFERRED_FINANCIAL');
    });

    it('calls deferTask with N_A_STRUCTURAL when selected', () => {
      const deferTask = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: mockWorkOrder,
        deferTask,
      });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('defer-btn-triage_dashboard_lights'));
      fireEvent.change(screen.getByTestId('defer-type-select'), {
        target: { value: 'N_A_STRUCTURAL' },
      });
      fireEvent.click(screen.getByTestId('defer-confirm-btn'));
      expect(deferTask).toHaveBeenCalledWith('triage_dashboard_lights', 'N_A_STRUCTURAL');
    });
  });

  // ─── AWAITING_AUTH ──────────────────────────────────────────────────────────

  describe('AWAITING_AUTH status', () => {
    it('shows awaiting auth banner', () => {
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: { ...mockWorkOrder, status: 'AWAITING_AUTH' },
      });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('awaiting-auth-banner')).toBeDefined();
    });

    it('does not show awaiting auth banner for IN_PROGRESS', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.queryByTestId('awaiting-auth-banner')).toBeNull();
    });
  });

  // ─── CLOSED status ──────────────────────────────────────────────────────────

  describe('CLOSED status', () => {
    const closedOrder: UpaWorkOrderDetail = {
      ...mockWorkOrder,
      status: 'CLOSED',
      closedAt: '2024-01-02T00:00:00.000Z',
      tasks: [],
    };

    it('shows new order button when order is closed', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closedOrder });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('new-order-btn')).toBeDefined();
    });

    it('does not show close button when order is already closed', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closedOrder });
      render(<UpaWorkspace />);
      expect(screen.queryByTestId('close-order-btn')).toBeNull();
    });

    it('calls resetOrder when new order button is clicked', () => {
      const resetOrder = vi.fn();
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: closedOrder,
        resetOrder,
      });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('new-order-btn'));
      expect(resetOrder).toHaveBeenCalled();
    });
  });

  // ─── Embedded Mode (workOrderId + onReturn props) ──────────────────────────

  describe('Embedded mode', () => {
    it('calls loadOrder with workOrderId on mount instead of showing InitForm', () => {
      const loadOrder = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, loadOrder });
      render(<UpaWorkspace workOrderId={42} />);
      expect(loadOrder).toHaveBeenCalledWith(42);
      expect(screen.queryByTestId('vehicle-id-input')).toBeNull();
    });

    it('shows loading state when workOrderId provided but workOrder is null and loading', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, loading: true });
      render(<UpaWorkspace workOrderId={42} />);
      expect(screen.queryByTestId('vehicle-id-input')).toBeNull();
    });

    it('shows upa-return-btn when onReturn is provided and work order is active', () => {
      const onReturn = vi.fn();
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace workOrderId={1} onReturn={onReturn} />);
      expect(screen.getByTestId('upa-return-btn')).toBeDefined();
    });

    it('does not show upa-return-btn when onReturn is not provided', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace workOrderId={1} />);
      expect(screen.queryByTestId('upa-return-btn')).toBeNull();
    });

    it('calls onReturn when back button is clicked', () => {
      const onReturn = vi.fn();
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace workOrderId={1} onReturn={onReturn} />);
      fireEvent.click(screen.getByTestId('upa-return-btn'));
      expect(onReturn).toHaveBeenCalled();
    });

    it('shows Volver a Mantenimiento button on closed order when onReturn provided', () => {
      const closedOrder = {
        ...mockWorkOrder,
        status: 'CLOSED' as const,
        closedAt: '2024-01-02T00:00:00.000Z',
        tasks: [],
      };
      const onReturn = vi.fn();
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closedOrder });
      render(<UpaWorkspace workOrderId={1} onReturn={onReturn} />);
      fireEvent.click(screen.getByTestId('new-order-btn'));
      expect(onReturn).toHaveBeenCalled();
    });
  });

  // ─── Evidence Inputs ────────────────────────────────────────────────────────

  describe('Evidence inputs for closure tasks', () => {
    const closureTask = {
      ...mockTask,
      taskId: 'closure_check_final',
      stage: 'closure' as const,
    };
    const closureOrder: UpaWorkOrderDetail = {
      ...mockWorkOrder,
      tasks: [closureTask],
    };

    it('shows evidence URL input for closure stage pending tasks', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closureOrder });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('accordion-toggle-closure'));
      expect(screen.getByTestId('add-evidence-url-btn')).toBeDefined();
    });

    it('does not show evidence inputs for non-closure tasks', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: mockWorkOrder });
      render(<UpaWorkspace />);
      expect(screen.queryByTestId('add-evidence-url-btn')).toBeNull();
    });

    it('adds a URL input when add button clicked', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closureOrder });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('accordion-toggle-closure'));
      fireEvent.click(screen.getByTestId('add-evidence-url-btn'));
      expect(screen.getByTestId('evidence-url-input-0')).toBeDefined();
    });

    it('shows evidence notes textarea', () => {
      vi.mocked(useUpaOrder).mockReturnValue({ ...baseHook, workOrder: closureOrder });
      render(<UpaWorkspace />);
      fireEvent.click(screen.getByTestId('accordion-toggle-closure'));
      expect(screen.getByTestId('evidence-notes-input')).toBeDefined();
    });
  });

  // ─── Multiple tasks ─────────────────────────────────────────────────────────

  describe('Multiple tasks across stages', () => {
    it('renders task cards for all tasks', () => {
      const secondTask = {
        ...mockTask,
        taskId: 'triage_horn',
        description: 'Revisión de claxon',
      };
      vi.mocked(useUpaOrder).mockReturnValue({
        ...baseHook,
        workOrder: { ...mockWorkOrder, tasks: [mockTask, secondTask] },
      });
      render(<UpaWorkspace />);
      expect(screen.getByTestId('task-card-triage_dashboard_lights')).toBeDefined();
      expect(screen.getByTestId('task-card-triage_horn')).toBeDefined();
    });
  });
});
