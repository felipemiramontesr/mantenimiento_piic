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

const MINE_UNIT_GASOLINE = {
  id: 'ASM-030',
  marca: 'Toyota',
  modelo: 'Hilux',
  status: 'Disponible',
  odometer: 15000,
  maintIntervalKm: 5000,
  fuelTypeId: 11,
  placas: 'GAS-001',
  departamento: 'MINA',
};

const MINE_UNIT_DIESEL = {
  id: 'ASM-031',
  marca: 'Toyota',
  modelo: 'Hilux',
  status: 'Disponible',
  odometer: 15000,
  maintIntervalKm: 5000,
  fuelTypeId: 10,
  placas: 'DIE-001',
  departamento: 'MINA',
};

// 15-task payload: ADVANCED_50K cascade (BASIC_10K × 9, INTERMEDIATE_20K × 5) + Toyota ADVANCED_50K delta
const TOYOTA_ADVANCED_CASCADE_TASKS = [
  {
    code: 'OIL_CHANGE',
    label: 'Cambio de aceite de motor',
    isCritical: true,
    isDeferredCarry: false,
  },
  {
    code: 'OIL_FILTER',
    label: 'Cambio de filtro de aceite',
    isCritical: true,
    isDeferredCarry: false,
  },
  { code: 'LEVELS_CHECK', label: 'Revisión de niveles', isCritical: false, isDeferredCarry: false },
  { code: 'BRAKES_CHECK', label: 'Revisión de frenos', isCritical: true, isDeferredCarry: false },
  {
    code: 'SUSPENSION_CHECK',
    label: 'Revisión de suspensión',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'BATTERY_CHECK',
    label: 'Revisión de batería',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'TIRES_CHECK',
    label: 'Revisión de neumáticos',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'TIRE_ROTATION',
    label: 'Rotación de neumáticos',
    isCritical: false,
    isDeferredCarry: false,
  },
  { code: 'BASIC_SCAN', label: 'Escaneo básico OBD', isCritical: false, isDeferredCarry: false },
  {
    code: 'AIR_FILTER_CHANGE',
    label: 'Cambio de filtro de aire',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'CABIN_FILTER_CHANGE',
    label: 'Cambio de filtro de cabina',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'BRAKES_CLEANING',
    label: 'Limpieza de frenos',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'BELTS_HOSES_CHECK',
    label: 'Revisión de bandas y mangueras',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'COOLING_SYSTEM_CHECK',
    label: 'Revisión de sistema de enfriamiento',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'SUV_PICKUPS_DIFF_CHECK',
    label: 'Revisión diferencial SUV/Pickup (Toyota)',
    isCritical: true,
    isDeferredCarry: false,
  },
];

// Server filtered these for gasoline (fuelTypeId=11) — WATER_SEPARATOR_MINING absent
const MINOR_MINING_GASOLINE_TASKS = [
  {
    code: 'OIL_CHANGE_MINING',
    label: 'Cambio de aceite minería',
    isCritical: true,
    isDeferredCarry: false,
  },
  {
    code: 'OIL_FILTER_MINING',
    label: 'Cambio de filtro de aceite',
    isCritical: true,
    isDeferredCarry: false,
  },
  {
    code: 'AIR_FILTER_MINING',
    label: 'Cambio de filtro de aire',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'FUEL_FILTER_MINING',
    label: 'Cambio de filtro de combustible',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'CABIN_FILTER_MINING',
    label: 'Filtro de cabina (gasolina)',
    isCritical: false,
    isDeferredCarry: false,
  },
];

// Server filtered these for diesel (fuelTypeId=10) — CABIN_FILTER_MINING absent
const MINOR_MINING_DIESEL_TASKS = [
  {
    code: 'OIL_CHANGE_MINING',
    label: 'Cambio de aceite minería',
    isCritical: true,
    isDeferredCarry: false,
  },
  {
    code: 'OIL_FILTER_MINING',
    label: 'Cambio de filtro de aceite',
    isCritical: true,
    isDeferredCarry: false,
  },
  {
    code: 'AIR_FILTER_MINING',
    label: 'Cambio de filtro de aire',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'FUEL_FILTER_MINING',
    label: 'Cambio de filtro de combustible',
    isCritical: false,
    isDeferredCarry: false,
  },
  {
    code: 'WATER_SEPARATOR_MINING',
    label: 'Separador de agua (diésel)',
    isCritical: false,
    isDeferredCarry: false,
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

describe('MaintenanceRegistrationForm', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] })),
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({ success: true, data: { vehicleId: '', odometer: 0, tasks: [] } })
      )
    );
  });

  it('Should render correct cascade and brand delta for a Toyota Hilux at 58K KM', async () => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [TOYOTA_UNIT] })),
      http.get('*/maintenance/template/ASM-021', () =>
        HttpResponse.json({ success: true, tasks: TOYOTA_ADVANCED_CASCADE_TASKS })
      )
    );

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    // Toyota ADVANCED_50K brand delta must be present
    await waitFor(() => {
      expect(screen.getByText('SUV_PICKUPS_DIFF_CHECK')).toBeInTheDocument();
    });
    expect(screen.getByText('Revisión diferencial SUV/Pickup (Toyota)')).toBeInTheDocument();

    // BASIC_10K Toyota delta (STRICT_PREVENTIVE_INSPECT) must NOT be present
    expect(screen.queryByText('STRICT_PREVENTIVE_INSPECT')).not.toBeInTheDocument();

    // All 15 task codes rendered — one per task row
    TOYOTA_ADVANCED_CASCADE_TASKS.map((t) => t.code).forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
  });

  it('Should not display WATER_SEPARATOR_MINING for a gasoline mine unit', async () => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [MINE_UNIT_GASOLINE] })),
      http.get('*/maintenance/template/ASM-030', () =>
        HttpResponse.json({ success: true, tasks: MINOR_MINING_GASOLINE_TASKS })
      )
    );

    renderForm();
    await selectUnit(/ASM-030 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('CABIN_FILTER_MINING')).toBeInTheDocument();
    });

    expect(screen.queryByText('WATER_SEPARATOR_MINING')).not.toBeInTheDocument();
  });

  it('Should not display CABIN_FILTER_MINING for a diesel mine unit', async () => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [MINE_UNIT_DIESEL] })),
      http.get('*/maintenance/template/ASM-031', () =>
        HttpResponse.json({ success: true, tasks: MINOR_MINING_DIESEL_TASKS })
      )
    );

    renderForm();
    await selectUnit(/ASM-031 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('WATER_SEPARATOR_MINING')).toBeInTheDocument();
    });

    expect(screen.queryByText('CABIN_FILTER_MINING')).not.toBeInTheDocument();
  });

  it('Should render UPA preview panel with triage tasks after selecting a unit', async () => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [TOYOTA_UNIT] })),
      http.get('*/work-orders/preview/*', () =>
        HttpResponse.json({
          success: true,
          data: {
            vehicleId: 'ASM-021',
            odometer: 58774,
            tasks: [
              {
                id: 'triage_lights',
                stage: 'triage',
                description: 'Revisión de luces',
                packageLevel: null,
              },
              {
                id: 'minor_oil',
                stage: 'minor_service',
                description: 'Cambio de aceite UPA',
                packageLevel: '10k',
              },
            ],
          },
        })
      )
    );

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    await waitFor(() => {
      expect(screen.getByText('VISTA PREVIA UPA')).toBeInTheDocument();
    });

    // Triage accordion is open by default and shows task
    expect(screen.getByText('Triaje')).toBeInTheDocument();
    expect(screen.getByText('Revisión de luces')).toBeInTheDocument();

    // Minor service accordion starts closed — description not visible yet
    expect(screen.getByText('Servicio Menor')).toBeInTheDocument();
    expect(screen.queryByText('Cambio de aceite UPA')).not.toBeInTheDocument();
  });

  it('Should expose SKIPPED_NA and DEFERRED in task status selector', async () => {
    server.use(
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [TOYOTA_UNIT] })),
      http.get('*/maintenance/template/ASM-021', () =>
        HttpResponse.json({
          success: true,
          tasks: [TOYOTA_ADVANCED_CASCADE_TASKS[0]],
        })
      )
    );

    renderForm();
    await selectUnit(/ASM-021 - Toyota Hilux/);

    // Wait for the single task to load
    await waitFor(() => {
      expect(screen.getByText('OIL_CHANGE')).toBeInTheDocument();
    });

    // Click the status select trigger (shows "Correcto" by default)
    const statusTrigger = screen.getByText('Correcto');
    fireEvent.click(statusTrigger);

    expect(await screen.findByText('Diferido — Próxima Orden')).toBeInTheDocument();
    expect(screen.queryByText('Omitido — No Aplica')).not.toBeInTheDocument();
  });
});
