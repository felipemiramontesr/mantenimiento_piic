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
