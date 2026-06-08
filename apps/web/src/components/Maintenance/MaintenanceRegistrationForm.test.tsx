import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceRegistrationForm from './MaintenanceRegistrationForm';

const TOYOTA_UNIT = {
  id: 'ASM-021',
  marca: 'Toyota',
  modelo: 'Hilux',
  status: 'Disponible',
  odometer: 58774,
  maintIntervalKm: 10000,
  fuelTypeId: 11,
  placas: 'XYZ-789',
  departamento: 'MINA',
};

const UPA_PREVIEW_TASKS = [
  { id: 'triage_lights', stage: 'triage', description: 'Revisión de luces', packageLevel: null },
  {
    id: 'minor_oil',
    stage: 'minor_service',
    description: 'Cambio de aceite UPA',
    packageLevel: '10k',
  },
];

const noop = (): void => undefined;

const renderForm = (): void => {
  render(<MaintenanceRegistrationForm onSuccess={noop} onCancel={noop} />);
};

const selectUnit = async (unitLabel: RegExp): Promise<void> => {
  const trigger = await screen.findByText('Buscar unidad...');
  fireEvent.click(trigger);
  const option = await screen.findByText(unitLabel);
  fireEvent.click(option);
};

const withUpaPreviewTasks = (tasks: typeof UPA_PREVIEW_TASKS): ReturnType<typeof http.get> =>
  http.get('*/work-orders/preview/*', () =>
    HttpResponse.json({ success: true, data: { vehicleId: 'ASM-021', odometer: 58774, tasks } })
  );

describe('MaintenanceRegistrationForm', () => {
  beforeEach(() => {
    server.use(
      withUpaPreviewTasks([]),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [TOYOTA_UNIT] }))
    );
  });

  it('Should render interactive panel titled REVISIÓN DE TAREAS UPA after selecting a unit', async () => {
    server.use(withUpaPreviewTasks(UPA_PREVIEW_TASKS));

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('REVISIÓN DE TAREAS UPA')).toBeInTheDocument();
    });

    expect(screen.getByText('Triaje')).toBeInTheDocument();
    expect(screen.getByText('Revisión de luces')).toBeInTheDocument();
    // minor_service accordion closed by default
    expect(screen.queryByText('Cambio de aceite UPA')).not.toBeInTheDocument();
  });

  it('Should NOT render CHECKLIST OPERATIVO or INSPECCIÓN DE ENTRADA in any mode', async () => {
    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('REVISIÓN DE TAREAS UPA')).toBeInTheDocument();
    });

    expect(screen.queryByText('CHECKLIST OPERATIVO')).not.toBeInTheDocument();
    expect(screen.queryByText('INSPECCIÓN DE ENTRADA')).not.toBeInTheDocument();
  });

  it('Should show ArchonSelect per UPA task defaulting to Tarea Aprobada', async () => {
    server.use(withUpaPreviewTasks([UPA_PREVIEW_TASKS[0]]));

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('Revisión de luces')).toBeInTheDocument();
    });

    // Default PASS value renders as "Tarea Aprobada" in the select trigger
    expect(screen.getByText('Tarea Aprobada')).toBeInTheDocument();
  });

  it('Should expose exactly three UPA status options and none of the legacy ones', async () => {
    server.use(withUpaPreviewTasks([UPA_PREVIEW_TASKS[0]]));

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('Revisión de luces')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tarea Aprobada'));

    expect(await screen.findByText('No Aplica')).toBeInTheDocument();
    expect(screen.getByText('Diferido Próxima Orden')).toBeInTheDocument();

    // Legacy options must NOT appear
    expect(screen.queryByText('Correcto')).not.toBeInTheDocument();
    expect(screen.queryByText('Reemplazado')).not.toBeInTheDocument();
    expect(screen.queryByText('Falla')).not.toBeInTheDocument();
    expect(screen.queryByText(/Omitido/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diferido — Próxima Orden/)).not.toBeInTheDocument();
  });

  it('Should update task status when encargado selects No Aplica', async () => {
    server.use(withUpaPreviewTasks([UPA_PREVIEW_TASKS[0]]));

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('Revisión de luces')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tarea Aprobada'));
    fireEvent.click(await screen.findByText('No Aplica'));

    await waitFor(() => {
      expect(screen.getByText('No Aplica')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tarea Aprobada')).not.toBeInTheDocument();
  });

  it('Should update task status when encargado selects Diferido Próxima Orden', async () => {
    server.use(withUpaPreviewTasks([UPA_PREVIEW_TASKS[0]]));

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('Revisión de luces')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tarea Aprobada'));
    fireEvent.click(await screen.findByText('Diferido Próxima Orden'));

    await waitFor(() => {
      expect(screen.getByText('Diferido Próxima Orden')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tarea Aprobada')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeServiceType — badge via odometry (RED-first: zero tests existed)
// Lógica pura con condiciones: ciclo 60,000 km + ventanas ± tolerancia.
// ─────────────────────────────────────────────────────────────────────────────
const makeUnit = (id: string, odometer: number, maintIntervalKm: number): typeof TOYOTA_UNIT => ({
  id,
  marca: 'Test',
  modelo: 'Unit',
  status: 'Disponible',
  odometer,
  maintIntervalKm,
  fuelTypeId: 11,
  placas: 'TST-001',
  departamento: 'MINA',
});

describe('computeServiceType — service badge via odometry', () => {
  beforeEach(() => {
    server.use(
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({ success: true, data: { vehicleId: '', odometer: 0, tasks: [] } })
      )
    );
  });

  const assertBadge = async (unit: typeof TOYOTA_UNIT, expectedLabel: string): Promise<void> => {
    server.use(http.get('*/fleet', () => HttpResponse.json({ success: true, data: [unit] })));
    renderForm();
    await selectUnit(new RegExp(`${unit.id} - Test Unit`));
    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  };

  it('odometer=10,000 km → Básico 10,000 km (within BASIC_10K window 9k–11k)', async () => {
    await assertBadge(makeUnit('U-10K', 10000, 10000), 'Básico 10,000 km');
  });

  it('odometer=20,000 km → Intermedio 20,000 km (within INTERMEDIATE_20K window 19k–21k)', async () => {
    await assertBadge(makeUnit('U-20K', 20000, 10000), 'Intermedio 20,000 km');
  });

  it('odometer=35,000 km → Mayor 30,000 km (within MAJOR_30K window 29k–41k)', async () => {
    await assertBadge(makeUnit('U-35K', 35000, 10000), 'Mayor 30,000 km');
  });

  it('odometer=50,000 km → Avanzado 50,000 km (within ADVANCED_50K window 49k–51k)', async () => {
    await assertBadge(makeUnit('U-50K', 50000, 10000), 'Avanzado 50,000 km');
  });

  it('odometer=59,500 km → Avanzado 50,000 km (upper tolerance: remainder 59500 ≥ 59000)', async () => {
    await assertBadge(makeUnit('U-TOL', 59500, 10000), 'Avanzado 50,000 km');
  });

  it('mine unit at 22,000 km → Servicio Menor (falls through all windows, isMineUnit=true)', async () => {
    await assertBadge(makeUnit('U-MINE', 22000, 5000), 'Servicio Menor');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPA panel — behavioral invariant: unit re-selection resets task decisions
// ─────────────────────────────────────────────────────────────────────────────
describe('UPA panel — unit re-selection resets task decisions', () => {
  const UNIT_A = makeUnit('UPA-A', 10000, 10000);
  const UNIT_B = makeUnit('UPA-B', 20000, 10000);

  const TASK_ALPHA = {
    id: 'alpha_triage',
    stage: 'triage',
    description: 'Tarea Alpha Triaje',
    packageLevel: null,
  } as const;
  const TASK_BETA = {
    id: 'beta_triage',
    stage: 'triage',
    description: 'Tarea Beta Triaje',
    packageLevel: null,
  } as const;

  beforeEach(() => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [UNIT_A, UNIT_B] })),
      http.get('*/work-orders/preview/:vehicleId', ({ params }) => {
        const tasks = params.vehicleId === 'UPA-A' ? [TASK_ALPHA] : [TASK_BETA];
        return HttpResponse.json({
          success: true,
          data: { vehicleId: params.vehicleId as string, odometer: 10000, tasks },
        });
      })
    );
  });

  it('Should reset all task decisions to PASS when a different unit is selected', async () => {
    renderForm();
    await selectUnit(/UPA-A - Test Unit/);

    await waitFor(() => {
      expect(screen.getByText('Tarea Alpha Triaje')).toBeInTheDocument();
    });

    // Change alpha task to N_A
    fireEvent.click(screen.getByText('Tarea Aprobada'));
    fireEvent.click(await screen.findByText('No Aplica'));
    await waitFor(() => {
      expect(screen.getByText('No Aplica')).toBeInTheDocument();
    });

    // Re-select a different unit by clicking current unit trigger
    fireEvent.click(screen.getByText('UPA-A - Test Unit'));
    fireEvent.click(await screen.findByText('UPA-B - Test Unit'));

    // Beta task appears with fresh PASS (not stale N_A from alpha unit)
    await waitFor(() => {
      expect(screen.getByText('Tarea Beta Triaje')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tarea Alpha Triaje')).not.toBeInTheDocument();
    expect(screen.getByText('Tarea Aprobada')).toBeInTheDocument();
    expect(screen.queryByText('No Aplica')).not.toBeInTheDocument();
  });
});
