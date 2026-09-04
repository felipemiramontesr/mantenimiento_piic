import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { LogisticsSection } from './LogisticsSection';
import { CatalogOption, CreateFleetUnit } from '../../../types/fleet';

/**
 * R4-C Fc162 — LogisticsSection.tsx had no dedicated test file. Every
 * onChange handler in its internal field components (never exported
 * individually, only reachable through the composed section) sat
 * uncovered, along with each ArchonSelect's `options={catalog.map(...)}`
 * JSX prop expression (only executes on render with a non-empty catalog).
 */

const locations: CatalogOption[] = [
  { id: 1, label: 'Sede Norte' },
  { id: 2, label: 'Sede Sur' },
];

const maintenanceCenters: CatalogOption[] = [
  { id: 1, label: 'Centro A' },
  { id: 2, label: 'Centro B' },
];

const assetTypes: CatalogOption[] = [{ id: 1, code: 'AT_VEH', label: 'Vehículo' }];

const baseFormData: CreateFleetUnit = {
  assetTypeId: 1,
  brandId: null,
  modelId: null,
  id: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
};

const Harness = ({ isEdit = false }: { isEdit?: boolean }): React.JSX.Element => {
  const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
  return (
    <LogisticsSection
      formData={formData}
      setFormData={setFormData}
      locations={locations}
      maintenanceCenters={maintenanceCenters}
      assetTypes={assetTypes}
      isEdit={isEdit}
    />
  );
};

/** Opens the topmost still-unselected ArchonSelect and clicks the given option label. */
const pickFirstOpenSelect = (optionLabel: string): void => {
  const trigger = screen.getAllByText('Seleccionar...')[0];
  fireEvent.click(trigger);
  fireEvent.click(screen.getByText(optionLabel));
};

describe('LogisticsSection', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates locationId via the Sede select and odometer via its input', () => {
    render(<Harness />);

    pickFirstOpenSelect('Sede Norte');
    expect(screen.getByText('Sede Norte')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: 45000'), { target: { value: '12345.5' } });
    expect(screen.getByPlaceholderText('Ej: 45000')).toHaveValue(12345.5);
  });

  it('updates maintIntervalDays/maintIntervalKm and the protocol start date (create mode only)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));

    render(<Harness isEdit={false} />);

    fireEvent.change(screen.getByPlaceholderText('Ej: 90'), { target: { value: '120' } });
    expect(screen.getByPlaceholderText('Ej: 90')).toHaveValue(120);

    fireEvent.change(screen.getByPlaceholderText('Ej: 5000'), { target: { value: '6000' } });
    expect(screen.getByPlaceholderText('Ej: 5000')).toHaveValue(6000);

    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    fireEvent.click(screen.getByText('12'));
    expect(screen.getByText('12 / 03 / 2026')).toBeInTheDocument();
  });

  it('updates lastServiceDate via day selection and lastServiceReading via its input', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('dd / mm / aaaa'));
    fireEvent.click(screen.getByText('15'));
    expect(screen.queryByText('dd / mm / aaaa')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: 40000'), { target: { value: '39999.5' } });
    expect(screen.getByPlaceholderText('Ej: 40000')).toHaveValue(39999.5);
  });

  it('updates maintenanceCenterId via the Centro select and dailyUsageAvg via its input', () => {
    render(<Harness />);

    const selects = screen.getAllByText('Seleccionar...');
    fireEvent.click(selects[selects.length - 1]);
    fireEvent.click(screen.getByText('Centro B'));
    expect(screen.getByText('Centro B')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: 50.5'), { target: { value: '75.25' } });
    expect(screen.getByPlaceholderText('Ej: 50.5')).toHaveValue(75.25);
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 56,92,112,203,232,254 ──

  it('clears odometer, maintIntervalDays, maintIntervalKm, lastServiceReading and dailyUsageAvg to undefined', () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText('Ej: 45000'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 45000'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 45000')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 90'), { target: { value: '30' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 90'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 90')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 5000'), { target: { value: '1000' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 5000'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 5000')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 40000'), { target: { value: '500' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 40000'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 40000')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 50.5'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 50.5'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 50.5')).toHaveValue(null);
  });

  it('renders an empty Centro de Gestión select when maintenanceCenters is not provided', () => {
    const Wrapper = (): React.JSX.Element => {
      const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
      return (
        <LogisticsSection
          formData={formData}
          setFormData={setFormData}
          locations={locations}
          maintenanceCenters={undefined as unknown as CatalogOption[]}
          assetTypes={assetTypes}
          isEdit={false}
        />
      );
    };
    render(<Wrapper />);
    expect(screen.getAllByText('Seleccionar...').length).toBeGreaterThan(0);
  });
});
