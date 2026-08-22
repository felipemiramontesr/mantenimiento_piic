import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InsuranceFields } from './InsuranceFields';
import { CatalogOption, CreateFleetUnit } from '../../../types/fleet';

/**
 * R4-C Fc162 — InsuranceFields.tsx had no dedicated test file. Every
 * onChange handler in its internal field components (never exported
 * individually, only reachable through the composed section) sat
 * uncovered.
 */

const complianceStatuses: CatalogOption[] = [
  { id: 1, label: 'Vigente' },
  { id: 2, label: 'Vencido' },
];

const insuranceCompanies: CatalogOption[] = [
  { id: 1, label: 'GNP' },
  { id: 2, label: 'AXA' },
];

const baseFormData: CreateFleetUnit = {
  assetTypeId: 1,
  brandId: null,
  modelId: null,
  id: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
};

const Harness = (): React.JSX.Element => {
  const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
  return (
    <InsuranceFields
      formData={formData}
      setFormData={setFormData}
      complianceStatuses={complianceStatuses}
      insuranceCompanies={insuranceCompanies}
    />
  );
};

describe('InsuranceFields', () => {
  it('updates complianceStatusId, insurancePolicyNumber, insuranceCompanyId and insuranceCost via their onChange handlers', () => {
    render(<Harness />);

    const selects = screen.getAllByText('Seleccionar...');
    fireEvent.click(selects[0]);
    fireEvent.click(screen.getByText('Vigente'));
    expect(screen.getByText('Vigente')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: POL-2024-XXXX'), {
      target: { value: 'POL-9999' },
    });
    expect(screen.getByPlaceholderText('Ej: POL-2024-XXXX')).toHaveValue('POL-9999');

    const remainingSelects = screen.getAllByText('Seleccionar...');
    fireEvent.click(remainingSelects[0]);
    fireEvent.click(screen.getByText('GNP'));
    expect(screen.getByText('GNP')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: 850.00'), {
      target: { value: '1200.50' },
    });
    expect(screen.getByPlaceholderText('Ej: 850.00')).toHaveValue(1200.5);
  });
});
