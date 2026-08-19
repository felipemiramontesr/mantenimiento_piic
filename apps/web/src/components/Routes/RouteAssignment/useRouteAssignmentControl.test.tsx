/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormEvent } from 'react';
import { http, HttpResponse } from 'msw';
import useRouteAssignmentControl, {
  parseAddress,
  getFinalDestination,
  roundToTwo,
  validateReadingFailsafe,
  validateDistance,
  validateFuelLevel,
  validateFuelCoherency,
  validateTirePressures,
} from './useRouteAssignmentControl';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import { RouteLog } from '../RouteLogTable';
import { RouteAssignmentFormData } from './types';
import server from '../../../test/server';

// 🔱 Mock Context Hooks
vi.mock('../../../context/FleetContext');
vi.mock('../../../context/UserContext');

// 🔱 Sovereign Mock Data (Stable References & Type Integrity)
const STABLE_FLEET_CONTEXT = {
  units: [{ id: 'ASM-001', fuelTankCapacity: 80 }],
  stats: {
    total: 0,
    available: 0,
    inRoute: 0,
    maintenance: 0,
    discontinued: 0,
    totalInactive: 0,
    maintenanceIndex: 0,
    openIncidents: 0,
    globalMTBF: 0,
    globalMTTR: 0,
    globalAvailability: 0,
    categories: {
      vehiculo: { total: 0, active: 0, health: 0 },
      maquinaria: { total: 0, active: 0, health: 0 },
      herramienta: { total: 0, active: 0, health: 0 },
    },
  } as any,
  loading: false,
  refreshUnits: vi.fn(),
  startRoute: vi.fn(),
  finishRoute: vi.fn(),
  reportIncident: vi.fn(),
};

const STABLE_USER_CONTEXT = {
  users: [],
  isLoading: false,
  activePanel: 'DIRECTORY' as const,
  setActivePanel: vi.fn(),
  fetchUsers: vi.fn(),
  toggleUserStatus: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  editingUser: null,
  setEditingUser: vi.fn(),
  departments: [],
  departmentsCatalog: [],
  roles: [],
};

const baseFormData: RouteAssignmentFormData = {
  unitId: '',
  operatorId: '',
  origin: 'Arian Silver Zacatecas',
  destination: '',
  destinationNeighborhoodId: undefined,
  description: '',
  fuelLevel: 100,
  arrivalFuelLevel: 100,
  startReading: 0,
  endReading: 0,
  fuelLitersLoaded: 0,
  fuelAmount: 0,
  fuelTicketImage: '',
  additivesCheck: false,
  tirePressureJson: '',
  checklistJson: '',
  calle: '',
  numero: '',
  numeroInterior: '',
};

/**
 * FC162 R4-B (100% mandatorio, 202_AN Bravo) — the 8 exported pure
 * validators/formatters (parseAddress/getFinalDestination/roundToTwo/
 * validate*) had zero direct tests despite being the bulk of the 146
 * uncovered Sonar lines. Self-contained, no rendering/mocking needed.
 */
describe('parseAddress', () => {
  it('extracts calle+numero via the "#" pattern (no Int.)', () => {
    const result = parseAddress('Calle Falsa #123, Col Centro, Ciudad, Estado');
    expect(result).toEqual({ calle: 'Calle Falsa', numero: '123', numeroInterior: '' });
  });

  it('extracts numeroInterior via "Int." and falls back to the trailing-digit pattern for numero', () => {
    const result = parseAddress('Bodega 5 Int. A2, Col Sur, Ciudad, Estado');
    expect(result).toEqual({ calle: 'Bodega', numero: '5', numeroInterior: 'A2' });
  });

  it('leaves numero/numeroInterior empty when neither pattern matches', () => {
    const result = parseAddress('Callejon del Sol, Col Poniente, Ciudad, Estado');
    expect(result).toEqual({ calle: 'Callejon del Sol', numero: '', numeroInterior: '' });
  });

  it('returns all-empty fields when the destination has fewer than 4 comma-separated parts', () => {
    const result = parseAddress('Solo una calle');
    expect(result).toEqual({ calle: '', numero: '', numeroInterior: '' });
  });
});

describe('getFinalDestination', () => {
  it('rebuilds the destination with calle+numero+numeroInterior when calle is set (4-part suffix)', () => {
    const result = getFinalDestination({
      ...baseFormData,
      calle: 'Calle Falsa',
      numero: '123',
      numeroInterior: 'A',
      destination: 'Viejo, Col X, Ciudad, Estado',
    });
    expect(result).toBe('Calle Falsa #123 Int. A, Col X, Ciudad, Estado');
  });

  it('uses the full destination as suffix when it has exactly 3 comma-separated parts', () => {
    const result = getFinalDestination({
      ...baseFormData,
      calle: 'Calle Falsa',
      destination: 'Col X, Ciudad, Estado',
    });
    expect(result).toBe('Calle Falsa, Col X, Ciudad, Estado');
  });

  it('returns the raw destination unchanged when calle is empty', () => {
    const result = getFinalDestination({ ...baseFormData, destination: 'Mina Sur' });
    expect(result).toBe('Mina Sur');
  });
});

describe('roundToTwo', () => {
  it('rounds to 2 decimals', () => {
    expect(roundToTwo(1.005)).toBeCloseTo(1, 2);
    expect(roundToTwo('12.3456')).toBe(12.35);
  });

  it('returns 0 for null/undefined/empty/NaN', () => {
    expect(roundToTwo(undefined)).toBe(0);
    expect(roundToTwo(null)).toBe(0);
    expect(roundToTwo('')).toBe(0);
    expect(roundToTwo('not-a-number')).toBe(0);
  });
});

describe('validateReadingFailsafe', () => {
  it('errors when editing an active route and endReading < startReading', () => {
    const result = validateReadingFailsafe(
      { ...baseFormData, startReading: 100, endReading: 50 },
      null,
      true,
      { uuid: 'r1' } as unknown as RouteLog
    );
    expect(result).toContain('Error Forense');
  });

  it('errors on new dispatch when startReading is below the unit odometer', () => {
    const result = validateReadingFailsafe(
      { ...baseFormData, startReading: 10 },
      { odometer: 500 } as unknown as import('../../../types/fleet').FleetUnit,
      false,
      null
    );
    expect(result).toContain('no puede ser menor al odómetro');
  });

  it('returns null when telemetry is coherent', () => {
    const result = validateReadingFailsafe(
      { ...baseFormData, startReading: 500 },
      { odometer: 500 } as unknown as import('../../../types/fleet').FleetUnit,
      false,
      null
    );
    expect(result).toBeNull();
  });
});

describe('validateDistance', () => {
  it('errors when endReading is 0', () => {
    expect(validateDistance({ ...baseFormData, startReading: 100, endReading: 0 })).toContain(
      'lectura de odómetro final'
    );
  });

  it('errors when end equals start (zero movement)', () => {
    expect(validateDistance({ ...baseFormData, startReading: 100, endReading: 100 })).toContain(
      'igual a la lectura inicial'
    );
  });

  it('errors when distance exceeds 5000km', () => {
    expect(validateDistance({ ...baseFormData, startReading: 0, endReading: 6000 })).toContain(
      'no puede superar los 5,000 km'
    );
  });

  it('returns null for a valid distance', () => {
    expect(validateDistance({ ...baseFormData, startReading: 100, endReading: 200 })).toBeNull();
  });
});

describe('validateFuelLevel', () => {
  it('errors when arrivalFuelLevel is out of the 0-100 range', () => {
    expect(validateFuelLevel({ ...baseFormData, arrivalFuelLevel: 150 })).toContain(
      'entre 0% y 100%'
    );
  });

  it('returns null for a valid fuel level', () => {
    expect(validateFuelLevel({ ...baseFormData, arrivalFuelLevel: 80 })).toBeNull();
  });
});

describe('validateFuelCoherency', () => {
  it('errors on negative liters', () => {
    expect(validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: -1 }, null)).toContain(
      'no pueden ser negativos'
    );
  });

  it('errors on negative amount', () => {
    expect(validateFuelCoherency({ ...baseFormData, fuelAmount: -1 }, null)).toContain(
      'no puede ser negativo'
    );
  });

  it('errors when liters are loaded but amount is zero', () => {
    expect(
      validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: 10, fuelAmount: 0 }, null)
    ).toContain('el costo total');
  });

  it('errors when amount is charged but liters are zero', () => {
    expect(
      validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: 0, fuelAmount: 500 }, null)
    ).toContain('los litros cargados');
  });

  it('errors when liters exceed the fallback 400L limit (no unit capacity)', () => {
    expect(
      validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: 401, fuelAmount: 1000 }, null)
    ).toContain('límite fallback');
  });

  it('errors when liters exceed 120% of the unit tank capacity', () => {
    expect(
      validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: 200, fuelAmount: 1000 }, {
        fuelTankCapacity: 100,
      } as unknown as import('../../../types/fleet').FleetUnit)
    ).toContain('capacidad de tanque');
  });

  it('returns null for coherent fuel data', () => {
    expect(
      validateFuelCoherency({ ...baseFormData, fuelLitersLoaded: 50, fuelAmount: 1000 }, {
        fuelTankCapacity: 100,
      } as unknown as import('../../../types/fleet').FleetUnit)
    ).toBeNull();
  });
});

describe('validateTirePressures', () => {
  it('errors when a tire pressure is out of the 20-100 PSI range', () => {
    const result = validateTirePressures({
      ...baseFormData,
      tirePressureJson: JSON.stringify({ DI: 150 }),
    });
    expect(result).toContain('presión del neumático DI');
  });

  it('ignores malformed JSON and returns null', () => {
    expect(validateTirePressures({ ...baseFormData, tirePressureJson: '{not-json' })).toBeNull();
  });

  it('skips undefined/empty positions and returns null when all present values are valid', () => {
    const result = validateTirePressures({
      ...baseFormData,
      tirePressureJson: JSON.stringify({ DI: 32, DD: '', TI: undefined }),
    });
    expect(result).toBeNull();
  });
});

describe('useRouteAssignmentControl (MSW Certified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // archonCache persists origins to localStorage, which jsdom does not
    // reset between tests — without this, a fetch mocked in one test can
    // leak its cached response into the next test's initial `origins` state.
    localStorage.clear();
    vi.mocked(useFleet).mockReturnValue(STABLE_FLEET_CONTEXT as any);
    vi.mocked(useUsers).mockReturnValue(STABLE_USER_CONTEXT as any);

    // 🔱 MSW Gateway: Suppress networking noise
    server.use(
      http.get('*/routes', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/catalogs/ROUTE_ORIGIN', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('initializes with default sovereign state', async () => {
    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()));
    await waitFor(() => {
      expect(result.current.formData.fuelLevel).toBe(100);
    });
  });

  it('hydrates form data when routeToEdit is provided', async () => {
    const mockRoute = {
      uuid: 'route-123',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      fuelLevel: 85,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), mockRoute));
    await waitFor(() => {
      expect(result.current.formData.unitId).toBe('ASM-001');
    });
  });

  it('handles mission start protocol (handleSubmit)', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(STABLE_FLEET_CONTEXT.startRoute).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('FC 076 R5 — corrección de misión activa envía {data, reason} (reason ≥5)', async () => {
    // Edit de ruta ACTIVA (endReading=0) → handleSubmit cae en
    // handleCorrectActiveMission → PUT /routes/:uuid. El schema del backend
    // exige reason min(5); este call-site lo omitía → 400 siempre.
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.put('*/routes/route-123', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true });
      })
    );

    const mockRoute = {
      uuid: 'route-123',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      fuelLevel: 85,
    } as unknown as RouteLog;

    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose, mockRoute));
    await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    await waitFor(() => expect(capturedBody).not.toBeNull());
    const body = capturedBody as unknown as { data: Record<string, unknown>; reason: string };
    expect(body.data).toBeDefined();
    expect(typeof body.reason).toBe('string');
    expect(body.reason.length).toBeGreaterThanOrEqual(5);
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to the default origin when the ROUTE_ORIGIN catalog fetch fails and cache is empty', async () => {
    server.use(http.get('*/catalogs/ROUTE_ORIGIN', () => HttpResponse.error()));

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()));

    await waitFor(() => {
      expect(result.current.origins).toEqual([{ id: 1, label: 'Arian Silver Zacatecas' }]);
    });
  });

  it('sorts availableUnits by id (both comparator directions exercised across 3 units)', async () => {
    vi.mocked(useFleet).mockReturnValue({
      ...STABLE_FLEET_CONTEXT,
      units: [
        { id: 'ASM-003', status: 'Disponible', marca: 'X', modelo: 'Y', placas: 'P3' },
        { id: 'ASM-001', status: 'Disponible', marca: 'X', modelo: 'Y', placas: 'P1' },
        { id: 'ASM-002', status: 'Disponible', marca: 'X', modelo: 'Y', placas: 'P2' },
      ],
    } as any);

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()));

    await waitFor(() => {
      expect(result.current.availableUnits.map((u) => u.value)).toEqual([
        'ASM-001',
        'ASM-002',
        'ASM-003',
      ]);
    });
  });

  it('resolves a matching originId when submitting a new dispatch (handleNewDispatch)', async () => {
    server.use(
      http.get('*/catalogs/ROUTE_ORIGIN', () =>
        HttpResponse.json({ success: true, data: [{ id: 5, label: 'Arian Silver Zacatecas' }] })
      )
    );

    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose));
    await waitFor(() => expect(result.current.origins[0]?.id).toBe(5));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(STABLE_FLEET_CONTEXT.startRoute).toHaveBeenCalledWith(
      expect.objectContaining({ originId: 5 })
    );
  });

  it('handles an active-mission correction with a matching originId (handleCorrectActiveMission)', async () => {
    server.use(
      http.get('*/catalogs/ROUTE_ORIGIN', () =>
        HttpResponse.json({ success: true, data: [{ id: 7, label: 'Arian Silver Zacatecas' }] })
      ),
      http.put('*/routes/route-origin-match', async ({ request }) => {
        const body = (await request.json()) as { data: Record<string, unknown> };
        expect(body.data.originId).toBe(7);
        return HttpResponse.json({ success: true });
      })
    );

    const mockRoute = {
      uuid: 'route-origin-match',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
    } as unknown as RouteLog;

    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose, mockRoute));
    await waitFor(() => expect(result.current.origins[0]?.id).toBe(7));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(onClose).toHaveBeenCalled();
  });

  // Nota: endReading NO se fija dejando que el auto-populate por unit.odometer
  // corra (efecto de "Selection Sync") — ese efecto compite con el re-hydrate
  // que se dispara cuando `origins` resuelve async (hydrateRouteData depende de
  // `origins`), y el orden relativo de ambos no es determinista entre archivos
  // de test. Se fija explícito vía updateForm tras la hidratación inicial para
  // un resultado reproducible, sin depender de esa carrera real del producto.
  it('dispatches handleFinishMission when editing an active route with endReading set (>0)', async () => {
    const mockRoute = {
      uuid: 'route-finish',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      end_time: null,
    } as unknown as RouteLog;

    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose, mockRoute));
    await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

    // Re-applied on every poll: a late-resolving origins fetch changes
    // hydrateRouteData's identity and re-runs the hydrate effect, which
    // unconditionally resets endReading — retry until it actually sticks.
    await waitFor(() => {
      act(() => {
        result.current.updateForm({ endReading: 500 });
      });
      expect(result.current.formData.endReading).toBe(500);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(STABLE_FLEET_CONTEXT.finishRoute).toHaveBeenCalledWith(
      'route-finish',
      expect.objectContaining({ endReading: 500 })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the audit modal instead of submitting when the route is already finished', async () => {
    const mockRoute = {
      uuid: 'route-finished',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      end_time: '2026-08-01T00:00:00Z',
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), mockRoute));
    await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

    await waitFor(() => {
      act(() => {
        result.current.updateForm({ endReading: 500 });
      });
      expect(result.current.formData.endReading).toBe(500);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(result.current.isAuditModalOpen).toBe(true);
    expect(result.current.auditAction).toBe('UPDATE');
    expect(STABLE_FLEET_CONTEXT.finishRoute).not.toHaveBeenCalled();
  });

  it('handleSubmit returns early (no dispatch) when telemetry validation fails', async () => {
    const mockRoute = {
      uuid: 'route-bad-distance',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      end_time: null,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), mockRoute));
    await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

    await waitFor(() => {
      act(() => {
        result.current.updateForm({ endReading: 6000 });
      });
      expect(result.current.formData.endReading).toBe(6000);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(result.current.error).toContain('no puede superar los 5,000 km');
    expect(STABLE_FLEET_CONTEXT.finishRoute).not.toHaveBeenCalled();
  });

  it('handleSubmit surfaces the operation error on a rejected dispatch', async () => {
    // startRoute is FleetContext's own function (already mocked as vi.fn()) —
    // rejecting it directly is what exercises handleSubmit's catch block, an
    // MSW override on the real endpoint would never be reached.
    vi.mocked(useFleet).mockReturnValue({
      ...STABLE_FLEET_CONTEXT,
      startRoute: vi.fn().mockRejectedValue(new Error('Server down')),
    } as any);

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()));
    // The origins fetch resolving late re-triggers the hydrate effect, which
    // resets `error` to null for a routeless hook (same race as the
    // endReading auto-populate above) — let it settle before submitting.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(result.current.error).toBe('Server down');
    expect(result.current.submitting).toBe(false);
  });

  describe('handleConfirmAudit / triggerAuditDelete', () => {
    const auditRoute = {
      uuid: 'route-audit',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      end_time: null,
    } as unknown as RouteLog;

    it('rejects a justification reason shorter than 5 characters', async () => {
      const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      await act(async () => {
        await result.current.handleConfirmAudit('hi');
      });

      expect(result.current.error).toContain('al menos 5 caracteres');
    });

    it('triggerAuditDelete sets auditAction=DELETE and opens the modal', async () => {
      const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      act(() => {
        result.current.triggerAuditDelete();
      });

      expect(result.current.auditAction).toBe('DELETE');
      expect(result.current.isAuditModalOpen).toBe(true);
    });

    it('blocks a UPDATE confirmation when telemetry validation fails', async () => {
      const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      act(() => {
        result.current.updateForm({ endReading: 6000 });
      });
      await waitFor(() => expect(result.current.formData.endReading).toBe(6000));

      await act(async () => {
        await result.current.handleConfirmAudit('Justificación válida');
      });

      expect(result.current.error).toContain('no puede superar los 5,000 km');
    });

    it('confirms an UPDATE audit: PUT payload sent, cache/fleet refreshed, modal closed', async () => {
      let putCalled = false;
      server.use(
        http.put('*/routes/route-audit', async () => {
          putCalled = true;
          return HttpResponse.json({ success: true });
        })
      );

      const onClose = vi.fn();
      const { result } = renderHook(() => useRouteAssignmentControl(onClose, auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      await act(async () => {
        await result.current.handleConfirmAudit('Justificación válida de 5+');
      });

      expect(putCalled).toBe(true);
      expect(STABLE_FLEET_CONTEXT.refreshUnits).toHaveBeenCalled();
      expect(result.current.isAuditModalOpen).toBe(false);
      expect(onClose).toHaveBeenCalled();
    });

    it('confirms a DELETE audit: DELETE payload sent, modal closed', async () => {
      let deleteCalled = false;
      server.use(
        http.delete('*/routes/route-audit', async () => {
          deleteCalled = true;
          return HttpResponse.json({ success: true });
        })
      );

      const onClose = vi.fn();
      const { result } = renderHook(() => useRouteAssignmentControl(onClose, auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      act(() => {
        result.current.triggerAuditDelete();
      });

      await act(async () => {
        await result.current.handleConfirmAudit('Justificación válida de 5+');
      });

      expect(deleteCalled).toBe(true);
      expect(result.current.isAuditModalOpen).toBe(false);
      expect(onClose).toHaveBeenCalled();
    });

    it('surfaces the server error and keeps the modal open when the audit PUT fails', async () => {
      server.use(
        http.put('*/routes/route-audit', () =>
          HttpResponse.json({ message: 'Auditoría rechazada' }, { status: 400 })
        )
      );

      const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), auditRoute));
      await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

      await act(async () => {
        await result.current.handleConfirmAudit('Justificación válida de 5+');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.submitting).toBe(false);
    });
  });
});
