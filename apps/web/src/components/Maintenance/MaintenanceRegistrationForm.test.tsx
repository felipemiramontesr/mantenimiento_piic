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
// UPA service badge — derived from UPA preview cascade level
// Badge label mirrors the highest cascadeLevel returned by the preview API.
// Legacy computeServiceType (odometer-based) was removed in Path B.
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

const makeCascadeTask = (
  level: string
): { id: string; stage: string; description: string; packageLevel: string } => ({
  id: `cascade_${level}`,
  stage: 'cascade',
  description: `Cascade ${level}`,
  packageLevel: level,
});

describe('UPA service badge — derived from preview cascade level', () => {
  const assertBadge = async (
    unit: typeof TOYOTA_UNIT,
    previewTasks: { id: string; stage: string; description: string; packageLevel: string | null }[],
    expectedLabel: string
  ): Promise<void> => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [unit] })),
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({
          success: true,
          data: { vehicleId: unit.id, odometer: unit.odometer, tasks: previewTasks },
        })
      )
    );
    renderForm();
    await selectUnit(new RegExp(`${unit.id} - Test Unit`));
    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  };

  it('cascade 10k in preview → Básico 10,000 km', async () => {
    await assertBadge(
      makeUnit('U-10K', 10000, 10000),
      [makeCascadeTask('10k')],
      'Básico 10,000 km'
    );
  });

  it('cascade 20k in preview → Intermedio 20,000 km', async () => {
    await assertBadge(
      makeUnit('U-20K', 20000, 10000),
      [makeCascadeTask('10k'), makeCascadeTask('20k')],
      'Intermedio 20,000 km'
    );
  });

  it('cascade 30k in preview → Mayor 30,000 km', async () => {
    await assertBadge(
      makeUnit('U-35K', 35000, 10000),
      [makeCascadeTask('10k'), makeCascadeTask('20k'), makeCascadeTask('30k')],
      'Mayor 30,000 km'
    );
  });

  it('cascade 50k in preview → Avanzado 50,000 km', async () => {
    await assertBadge(
      makeUnit('U-50K', 50000, 10000),
      [
        makeCascadeTask('10k'),
        makeCascadeTask('20k'),
        makeCascadeTask('30k'),
        makeCascadeTask('50k'),
      ],
      'Avanzado 50,000 km'
    );
  });

  it('cascade 50k in preview at 59,500 km → Avanzado 50,000 km', async () => {
    await assertBadge(
      makeUnit('U-TOL', 59500, 10000),
      [
        makeCascadeTask('10k'),
        makeCascadeTask('20k'),
        makeCascadeTask('30k'),
        makeCascadeTask('50k'),
      ],
      'Avanzado 50,000 km'
    );
  });

  it('mine unit without cascade → Servicio Menor badge', async () => {
    await assertBadge(makeUnit('U-MINE', 22000, 5000), [], 'Servicio Menor');
  });

  it('mine unit WITH cascade tasks → shows cascade level badge (not Servicio Menor)', async () => {
    await assertBadge(
      makeUnit('U-MINE-CASCADE', 50000, 5000),
      [
        makeCascadeTask('10k'),
        makeCascadeTask('20k'),
        makeCascadeTask('30k'),
        makeCascadeTask('50k'),
      ],
      'Avanzado 50,000 km'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isInProgress auto-derivation from UPA preview cascade stage
// ─────────────────────────────────────────────────────────────────────────────
describe('isInProgress derivation — UPA cascade overrides mine classification', () => {
  it('mine unit WITHOUT cascade tasks → In Situ mode', async () => {
    server.use(
      http.get('*/fleet', () =>
        HttpResponse.json({ success: true, data: [makeUnit('U-MINE-INS', 22000, 5000)] })
      ),
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({
          success: true,
          data: { vehicleId: 'U-MINE-INS', odometer: 22000, tasks: [] },
        })
      )
    );
    renderForm();
    await selectUnit(/U-MINE-INS - Test Unit/);
    await waitFor(() => {
      expect(screen.getByText('In Situ — Registro Inmediato')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ingreso a Taller — Downtime')).not.toBeInTheDocument();
  });

  it('mine unit WITH cascade tasks → TALLER mode (is_in_progress overridden)', async () => {
    server.use(
      http.get('*/fleet', () =>
        HttpResponse.json({ success: true, data: [makeUnit('U-MINE-TALLER', 50000, 5000)] })
      ),
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({
          success: true,
          data: {
            vehicleId: 'U-MINE-TALLER',
            odometer: 50000,
            tasks: [makeCascadeTask('10k')],
          },
        })
      )
    );
    renderForm();
    await selectUnit(/U-MINE-TALLER - Test Unit/);
    await waitFor(() => {
      expect(screen.getByText('Ingreso a Taller — Downtime')).toBeInTheDocument();
    });
    expect(screen.queryByText('In Situ — Registro Inmediato')).not.toBeInTheDocument();
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

// ── FC 074 F4 — Formularios_Y_Detalles_Apilables ──
describe('AT-FC074-F4 — mobile-first form hardening (MaintenanceRegistrationForm)', () => {
  beforeEach(() => {
    server.use(
      withUpaPreviewTasks([]),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [TOYOTA_UNIT] }))
    );
  });

  it('AT-FC074-F4-MR-1: los contenedores 2x2 apilan a 1 columna <md', async () => {
    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);
    const odometerInput = await screen.findByPlaceholderText('Ej: 125000');
    const grid = odometerInput.closest('.grid.grid-cols-1');
    expect(grid).not.toBeNull();
    expect(grid?.className).toMatch(/md:grid-cols-2/);
  });

  it('AT-FC074-F4-MR-2: el input de odómetro declara inputMode numeric', async () => {
    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);
    const odometerInput = await screen.findByPlaceholderText('Ej: 125000');
    expect(odometerInput).toHaveAttribute('inputmode', 'numeric');
  });

  it('AT-FC074-F4-MR-3: el input de costo declara inputMode decimal', async () => {
    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);
    const costInput = await screen.findByPlaceholderText('Ej: 3,450.00');
    expect(costInput).toHaveAttribute('inputmode', 'decimal');
  });

  it('AT-FC074-F4-MR-4: la barra de acciones (Cancelar/Guardar) es sticky bottom en móvil', async () => {
    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);
    const cancelBtn = await screen.findByText(/Cancelar/i);
    const actionBar = cancelBtn.closest('.archon-grid-2-sovereign');
    expect(actionBar?.className).toMatch(/\bsticky\b/);
    expect(actionBar?.className).toMatch(/bottom-0/);
  });
});
