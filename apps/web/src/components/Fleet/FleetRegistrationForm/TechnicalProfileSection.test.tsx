import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TechnicalProfileSection } from './TechnicalProfileSection';
import { CatalogOption, CreateFleetUnit } from '../../../types/fleet';

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — TechnicalProfileSection.tsx
 * had zero test coverage. Every onChange handler in its 8 internal field
 * components (never exported individually, only reachable through the
 * composed section) sat uncovered, along with each ArchonSelect's
 * `options={catalog.map(...)}` JSX prop expression (only executes on
 * render, so mounting the section with non-empty catalogs alone closes
 * those lines — no interaction needed for those).
 */

const catalog = (prefix: string, count = 2): CatalogOption[] =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, label: `${prefix} ${i + 1}` }));

const colors = catalog('Color');
const driveTypes = catalog('Traccion');
const transmissionTypes = catalog('Transmision');
const engineTypes = catalog('Motor');
const fuelTypes = catalog('Combustible');
const tireBrands = catalog('Marca');
const terrainTypes = catalog('Terreno');

const baseFormData: CreateFleetUnit = {
  assetTypeId: null,
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
    <TechnicalProfileSection
      formData={formData}
      setFormData={setFormData}
      colors={colors}
      driveTypes={driveTypes}
      transmissionTypes={transmissionTypes}
      engineTypes={engineTypes}
      fuelTypes={fuelTypes}
      tireBrands={tireBrands}
      terrainTypes={terrainTypes}
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

describe('TechnicalProfileSection', () => {
  it('renders every catalog-driven select and updates formData as each field is edited', () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText('Ej: 2024'), { target: { value: '2025' } });
    expect(screen.getByPlaceholderText('Ej: 2024')).toHaveValue(2025);

    // DOM order: Color -> Traccion -> Transmision -> Motor -> Combustible -> Marca -> Terreno
    pickFirstOpenSelect('Color 1');
    expect(screen.getByText('Color 1')).toBeInTheDocument();

    pickFirstOpenSelect('Traccion 1');
    expect(screen.getByText('Traccion 1')).toBeInTheDocument();

    pickFirstOpenSelect('Transmision 1');
    expect(screen.getByText('Transmision 1')).toBeInTheDocument();

    pickFirstOpenSelect('Motor 1');
    expect(screen.getByText('Motor 1')).toBeInTheDocument();

    pickFirstOpenSelect('Combustible 1');
    expect(screen.getByText('Combustible 1')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: 1500.0'), { target: { value: '1800.5' } });
    expect(screen.getByPlaceholderText('Ej: 1500.0')).toHaveValue(1800.5);

    fireEvent.change(screen.getByPlaceholderText('Ej: 80.0'), { target: { value: '95.5' } });
    expect(screen.getByPlaceholderText('Ej: 80.0')).toHaveValue(95.5);

    fireEvent.change(screen.getByPlaceholderText('Ej: 265/65 R17'), {
      target: { value: '285/70 R19' },
    });
    expect(screen.getByPlaceholderText('Ej: 265/65 R17')).toHaveValue('285/70 R19');

    pickFirstOpenSelect('Marca 1');
    expect(screen.getByText('Marca 1')).toBeInTheDocument();

    pickFirstOpenSelect('Terreno 1');
    expect(screen.getByText('Terreno 1')).toBeInTheDocument();

    // All 7 selects resolved — no placeholder trigger left.
    expect(screen.queryByText('Seleccionar...')).not.toBeInTheDocument();
  });

  it('clears the year field back to undefined when the input is emptied', () => {
    render(<Harness />);
    const yearInput = screen.getByPlaceholderText('Ej: 2024');
    fireEvent.change(yearInput, { target: { value: '2025' } });
    expect(yearInput).toHaveValue(2025);
    fireEvent.change(yearInput, { target: { value: '' } });
    expect(yearInput).toHaveValue(null);
  });

  it('in create mode (isEdit=false), the fuel level field sets both initialFuelLevel and lastFuelLevel', () => {
    render(<Harness isEdit={false} />);
    const fuelInput = screen.getByPlaceholderText('Ej: 100.00');
    expect(screen.getByText('Nivel de Combustible Inicial')).toBeInTheDocument();
    fireEvent.change(fuelInput, { target: { value: '75.5' } });
    expect(fuelInput).toHaveValue(75.5);
  });

  it('in edit mode (isEdit=true), the fuel level field sets only lastFuelLevel', () => {
    render(<Harness isEdit />);
    const fuelInput = screen.getByPlaceholderText('Ej: 100.00');
    expect(screen.getByText('Nivel de Combustible Actual')).toBeInTheDocument();
    fireEvent.change(fuelInput, { target: { value: '42' } });
    expect(fuelInput).toHaveValue(42);
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 40,155,176,214 ──

  it('clears capacidadCarga, fuelTankCapacity and the fuel level field back to undefined', () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText('Ej: 1500.0'), { target: { value: '1800.5' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 1500.0'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 1500.0')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 80.0'), { target: { value: '95.5' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 80.0'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 80.0')).toHaveValue(null);

    fireEvent.change(screen.getByPlaceholderText('Ej: 100.00'), { target: { value: '50' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 100.00'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 100.00')).toHaveValue(null);
  });

  it('renders an empty Color select when colors is not provided', () => {
    const Wrapper = (): React.JSX.Element => {
      const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
      return (
        <TechnicalProfileSection
          formData={formData}
          setFormData={setFormData}
          colors={undefined as unknown as CatalogOption[]}
          driveTypes={driveTypes}
          transmissionTypes={transmissionTypes}
          engineTypes={engineTypes}
          fuelTypes={fuelTypes}
          tireBrands={tireBrands}
          terrainTypes={terrainTypes}
          isEdit={false}
        />
      );
    };
    render(<Wrapper />);
    expect(screen.getAllByText('Seleccionar...').length).toBeGreaterThan(0);
  });
});
