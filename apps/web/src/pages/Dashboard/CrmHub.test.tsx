/**
 * FC-11 CRM_Hub_Navigation FaseA — CrmHub
 *
 * AT-FC11-A-WEB-1: renderiza exactamente 5 tarjetas de módulo CRM
 * AT-FC11-A-WEB-2: click en tarjeta Contratos navega a /dashboard/contracts
 * AT-FC11-A-WEB-3: data-testid "crm-hub" presente en el contenedor raíz
 * AT-FC11-A-WEB-4: todos los botones de tarjeta contienen el texto "ABRIR MÓDULO"
 * AT-FC11-A-WEB-5: setSectionData es llamado con 'CRM' al montar el componente
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import CrmHub from './CrmHub';

const navigateMock = vi.fn();
const setSectionDataMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: (): { setSectionData: typeof setSectionDataMock } => ({
    setSectionData: setSectionDataMock,
  }),
}));

const renderHub = (): ReturnType<typeof render> =>
  render(
    <BrowserRouter>
      <CrmHub />
    </BrowserRouter>
  );

describe('FC-11 CRM_Hub_Navigation FaseA — CrmHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
  });

  it('AT-FC11-A-WEB-1: renderiza exactamente 5 tarjetas de módulo CRM', () => {
    renderHub();
    const cards = [
      screen.getByTestId('crm-card-directorio'),
      screen.getByTestId('crm-card-contratos'),
      screen.getByTestId('crm-card-pipeline'),
      screen.getByTestId('crm-card-interacciones'),
      screen.getByTestId('crm-card-campanas'),
    ];
    expect(cards).toHaveLength(5);
    cards.forEach((card) => expect(card).toBeInTheDocument());
  });

  it('AT-FC11-A-WEB-2: click en tarjeta Contratos navega a /dashboard/contracts', () => {
    renderHub();
    fireEvent.click(screen.getByTestId('crm-card-contratos-btn'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/contracts');
  });

  it('AT-FC11-A-WEB-3: data-testid "crm-hub" presente en el contenedor raíz', () => {
    renderHub();
    expect(screen.getByTestId('crm-hub')).toBeInTheDocument();
  });

  it('AT-FC11-A-WEB-4: todos los botones de tarjeta contienen el texto "ABRIR MÓDULO"', () => {
    renderHub();
    const buttons = screen.getAllByText(/ABRIR MÓDULO/i);
    expect(buttons).toHaveLength(5);
  });

  it('AT-FC11-A-WEB-5: setSectionData es llamado con "CRM" al montar el componente', () => {
    renderHub();
    expect(setSectionDataMock).toHaveBeenCalledWith(
      'CRM',
      'Gestión de Relaciones con Clientes',
      null
    );
  });
});
