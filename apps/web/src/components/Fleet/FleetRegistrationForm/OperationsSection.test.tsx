import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OperationsSection } from './OperationsSection';
import { CreateFleetUnit } from '../../../types/fleet';

/**
 * R4-C Fc162 — OperationsSection.tsx had no dedicated test file. Its only
 * onChange handler (the "Especificaciones de fábrica" textarea) sat
 * uncovered, never having been exercised through the composed
 * FleetRegistrationForm nor in isolation.
 */

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
  return <OperationsSection formData={formData} setFormData={setFormData} />;
};

describe('OperationsSection', () => {
  it('updates description via the specifications textarea', () => {
    render(<Harness />);

    const textarea = screen.getByPlaceholderText(
      'Ingresar especificaciones críticas de este activo...'
    );
    fireEvent.change(textarea, { target: { value: 'Requiere revisión trimestral de frenos' } });
    expect(textarea).toHaveValue('Requiere revisión trimestral de frenos');
  });
});
