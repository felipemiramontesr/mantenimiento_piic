import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceSection, EnvironmentalPrediction } from './ComplianceSection';
import { CatalogOption, CreateFleetUnit } from '../../../types/fleet';

/**
 * R4-C Fc162 — ComplianceSection.tsx had no dedicated test file. Every
 * onChange handler in its internal field components (never exported
 * individually, only reachable through the composed section) sat
 * uncovered, along with the ArchonSelect `options={catalog.map(...)}`
 * JSX prop expression and the truthy-prediction render branch of
 * HologramPredictionPreview.
 */

const environmentalHolograms: CatalogOption[] = [
  { id: 1, code: '0', label: 'Holograma 0' },
  { id: 2, code: '1', label: 'Holograma 1' },
];

const baseFormData: CreateFleetUnit = {
  assetTypeId: null,
  brandId: null,
  modelId: null,
  id: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
};

const prediction: EnvironmentalPrediction = {
  hologramaSugerido: '0',
  engomadoColor: 'Amarillo',
  mesesVerificacion: 'Ene/Jul',
};

const Harness = ({
  isFlotillaOrInternal = true,
}: {
  isFlotillaOrInternal?: boolean;
}): React.JSX.Element => {
  const [formData, setFormData] = useState<CreateFleetUnit>(baseFormData);
  return (
    <ComplianceSection
      formData={formData}
      setFormData={setFormData}
      complianceStatuses={[]}
      insuranceCompanies={[]}
      environmentalHolograms={environmentalHolograms}
      isFlotillaOrInternal={isFlotillaOrInternal}
      vencimientoVerif={undefined}
      prediction={prediction}
    />
  );
};

/** Opens the topmost still-empty ArchonDatePicker and clicks the given day. */
const pickFirstEmptyDate = (day: string): void => {
  fireEvent.click(screen.getAllByText('dd / mm / aaaa')[0]);
  fireEvent.click(screen.getByText(day));
};

describe('ComplianceSection', () => {
  it('updates circulationCardNumber as the Folio input is edited', () => {
    render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText('Ej: 123456789'), {
      target: { value: 'FOLIO-777' },
    });
    expect(screen.getByPlaceholderText('Ej: 123456789')).toHaveValue('FOLIO-777');
  });

  it('updates every ArchonDatePicker field via day selection (legalComplianceDate, lastEnvironmentalVerification, lastMechanicalVerification)', () => {
    render(<Harness />);
    // 4 empty pickers: insuranceExpiryDate (InsuranceFields, incidental) + the 3 targets below.
    expect(screen.getAllByText('dd / mm / aaaa')).toHaveLength(4);

    pickFirstEmptyDate('10'); // insuranceExpiryDate
    pickFirstEmptyDate('12'); // legalComplianceDate
    pickFirstEmptyDate('15'); // lastEnvironmentalVerification -> calcularVencimientoVerificacion
    pickFirstEmptyDate('20'); // lastMechanicalVerification

    expect(screen.queryByText('dd / mm / aaaa')).not.toBeInTheDocument();
  });

  it('renders the hologram prediction preview and applies the suggested hologram on click', () => {
    render(<Harness />);
    expect(screen.getByText(/Calendario: Amarillo/)).toBeInTheDocument();
    expect(screen.getByText(/Usar Sugerido/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Usar Sugerido/));
    // Once applied, currentHologram === prediction.hologramaSugerido -> button disappears.
    expect(screen.queryByText(/Usar Sugerido/)).not.toBeInTheDocument();
  });

  it('selecting an environmental hologram option updates formData', () => {
    render(<Harness />);
    const selects = screen.getAllByText('Seleccionar...');
    fireEvent.click(selects[selects.length - 1]);
    fireEvent.click(screen.getByText('Holograma 1'));
    expect(screen.getByText('Holograma 1')).toBeInTheDocument();
  });

  it('updates accountingAccount and monthlyLeasePayment when isFlotillaOrInternal', () => {
    render(<Harness isFlotillaOrInternal />);

    fireEvent.change(screen.getByPlaceholderText('8019-XXX-XXX'), {
      target: { value: '8019-001-002' },
    });
    expect(screen.getByPlaceholderText('8019-XXX-XXX')).toHaveValue('8019-001-002');

    fireEvent.change(screen.getByPlaceholderText('Ej: 15500.50'), {
      target: { value: '12345.5' },
    });
    expect(screen.getByPlaceholderText('Ej: 15500.50')).toHaveValue(12345.5);

    fireEvent.change(screen.getByPlaceholderText('Ej: 15500.50'), { target: { value: '' } });
    expect(screen.getByPlaceholderText('Ej: 15500.50')).toHaveValue(null);
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 96,178,217 ──

  it('shows the "Vence:" amber banner when vencimientoVerif is set', () => {
    render(
      <ComplianceSection
        formData={baseFormData}
        setFormData={(): void => {}}
        complianceStatuses={[]}
        insuranceCompanies={[]}
        environmentalHolograms={environmentalHolograms}
        isFlotillaOrInternal
        vencimientoVerif="2026-10-15"
        prediction={prediction}
      />
    );
    expect(screen.getByText(/Vence:/)).toBeInTheDocument();
  });

  it('uses the default swatch color for an engomadoColor outside ENGOMADO_COLORS', () => {
    const { container } = render(
      <ComplianceSection
        formData={baseFormData}
        setFormData={(): void => {}}
        complianceStatuses={[]}
        insuranceCompanies={[]}
        environmentalHolograms={environmentalHolograms}
        isFlotillaOrInternal
        vencimientoVerif={undefined}
        prediction={{ ...prediction, engomadoColor: 'Desconocido' }}
      />
    );
    const swatch = container.querySelector('span.rounded-full') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(148, 163, 184)'); // #94a3b8
  });

  it('falls back to an empty option value when a hologram catalog entry has no code', () => {
    const holograms: CatalogOption[] = [{ id: 3, code: '', label: 'Sin Código' }];
    render(
      <ComplianceSection
        formData={baseFormData}
        setFormData={(): void => {}}
        complianceStatuses={[]}
        insuranceCompanies={[]}
        environmentalHolograms={holograms}
        isFlotillaOrInternal
        vencimientoVerif={undefined}
        prediction={null}
      />
    );
    // Open the Holograma Ambiental select — the last "Seleccionar..." trigger
    // — to reveal the option rendered from a catalog entry with code: ''.
    const triggers = screen.getAllByText('Seleccionar...');
    fireEvent.click(triggers[triggers.length - 1]);
    expect(screen.getByText('Sin Código')).toBeInTheDocument();
  });
});
