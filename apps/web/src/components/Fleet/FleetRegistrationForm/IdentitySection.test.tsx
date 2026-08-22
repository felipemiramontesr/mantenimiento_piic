import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IdentitySection } from './IdentitySection';
import { CatalogOption, CreateFleetUnit } from '../../../types/fleet';

/**
 * R4-C Fc162 — IdentitySection.tsx had no dedicated test file. Every onChange
 * handler in its internal field components (never exported individually,
 * only reachable through the composed section) sat uncovered — no test ever
 * selected a catalog option, typed into an identifier input, or removed an
 * uploaded image.
 */

const assetTypes: CatalogOption[] = [
  { id: 1, label: 'Camión' },
  { id: 2, label: 'Camioneta' },
];
const marcas: CatalogOption[] = [
  { id: 1, label: 'Marca A' },
  { id: 2, label: 'Marca B' },
];
const modelos: CatalogOption[] = [
  { id: 1, label: 'Modelo X' },
  { id: 2, label: 'Modelo Y' },
];
const owners: CatalogOption[] = [{ id: 1, label: 'Propietario A' }];
const useTypes: CatalogOption[] = [{ id: 1, label: 'Uso Interno' }];
const departments: CatalogOption[] = [{ id: 1, label: 'Depto A' }];

const baseFormData: CreateFleetUnit = {
  assetTypeId: 1,
  brandId: 1,
  modelId: null,
  id: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
  images: ['data:image/png;base64,existing'],
};

const Harness = ({
  isFlotillaOrInternal = true,
}: {
  isFlotillaOrInternal?: boolean;
}): React.JSX.Element => {
  const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
  return (
    <IdentitySection
      formData={formData}
      setFormData={setFormData}
      assetTypes={assetTypes}
      marcas={marcas}
      modelos={modelos}
      owners={owners}
      useTypes={useTypes}
      departments={departments}
      isLoading={false}
      handleAssetTypeChange={(id): void => setFormData((prev) => ({ ...prev, assetTypeId: id }))}
      handleMarcaChange={(id): void => setFormData((prev) => ({ ...prev, brandId: id }))}
      handleModeloChange={(id): void => setFormData((prev) => ({ ...prev, modelId: id }))}
      isFlotillaOrInternal={isFlotillaOrInternal}
    />
  );
};

describe('IdentitySection', () => {
  it('updates assetTypeId, brandId and modelId via their cascading selects', () => {
    render(<Harness />);

    // Tipo de Activo: preset to 'Camión', switch to 'Camioneta'
    fireEvent.click(screen.getByText('Camión'));
    fireEvent.click(screen.getByText('Camioneta'));
    expect(screen.getByText('Camioneta')).toBeInTheDocument();

    // Marca: preset to 'Marca A' (enabled since assetTypeId is set), switch to 'Marca B'
    fireEvent.click(screen.getByText('Marca A'));
    fireEvent.click(screen.getByText('Marca B'));
    expect(screen.getByText('Marca B')).toBeInTheDocument();

    // Modelo: unset, enabled since brandId is set — placeholder is distinct text
    fireEvent.click(screen.getByText('Seleccionar modelo...'));
    fireEvent.click(screen.getByText('Modelo X'));
    expect(screen.getByText('Modelo X')).toBeInTheDocument();
  });

  it('updates id/ownerId/placas/numeroSerie and removes the preset image', () => {
    const { container } = render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText('Ej: VEH-001'), {
      target: { value: 'VEH-042' },
    });
    expect(screen.getByPlaceholderText('Ej: VEH-001')).toHaveValue('VEH-042');

    // Estatus de Propiedad is the first plain 'Seleccionar...' trigger (ownerId unset)
    fireEvent.click(screen.getAllByText('Seleccionar...')[0]);
    fireEvent.click(screen.getByText('Propietario A'));
    expect(screen.getByText('Propietario A')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: XX-1234-A'), {
      target: { value: 'ab-1234-c' },
    });
    expect(screen.getByPlaceholderText('Ej: XX-1234-A')).toHaveValue('AB-1234-C');

    fireEvent.change(screen.getByPlaceholderText('Ej: 3VW... (17 caracteres)'), {
      target: { value: '3VWFE21C04M000001' },
    });
    expect(screen.getByPlaceholderText('Ej: 3VW... (17 caracteres)')).toHaveValue(
      '3VWFE21C04M000001'
    );

    // ArchonSelect triggers are <div>s — the only real <button> is the image remove control
    const removeImageBtn = container.querySelector('button');
    expect(removeImageBtn).not.toBeNull();
    fireEvent.click(removeImageBtn as HTMLButtonElement);
    expect(screen.queryByAltText('Vista 1')).not.toBeInTheDocument();
  });

  it('updates operationalUseId and departmentId (isFlotillaOrInternal renders Departamento)', () => {
    render(<Harness isFlotillaOrInternal />);

    const selects = screen.getAllByText('Seleccionar...');
    // [0]=Estatus de Propiedad, [1]=Uso Operativo, [2]=Departamento Responsable
    fireEvent.click(selects[1]);
    fireEvent.click(screen.getByText('Uso Interno'));
    expect(screen.getByText('Uso Interno')).toBeInTheDocument();

    fireEvent.click(selects[2]);
    fireEvent.click(screen.getByText('Depto A'));
    expect(screen.getByText('Depto A')).toBeInTheDocument();
  });
});
