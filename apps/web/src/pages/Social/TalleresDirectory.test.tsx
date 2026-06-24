/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import TalleresDirectory from './TalleresDirectory';
import api from '../../api/client';

/**
 * FC-9 SocialNetwork_Multiverso FaseD — TalleresDirectory
 *
 * AT-SOC9-D-WEB-1: renderiza talleres-directory container y search form
 * AT-SOC9-D-WEB-2: muestra taller-card cuando la API retorna talleres
 * AT-SOC9-D-WEB-3: muestra directory-empty cuando lista vacía
 * AT-SOC9-D-WEB-4: muestra directory-error cuando la API falla
 */

vi.mock('../../api/client');
const mockGet = vi.mocked(api.get);

const MOCK_TALLERES = [
  {
    id: 3,
    label: 'Arco Servicios',
    razonSocial: 'Arco SA de CV',
    especialidades: 'Frenos,Motor',
    telefono: '555-0001',
    direccion: 'Av. Principal 1',
    avgRating: 4.8,
    reviewCount: 10,
  },
];

describe('TalleresDirectory — FC-9 SocialNetwork FaseD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-SOC9-D-WEB-1: renderiza container y search form', async () => {
    mockGet.mockResolvedValueOnce({ data: { talleres: [] } });
    render(<TalleresDirectory />);
    expect(screen.getByTestId('talleres-directory')).toBeInTheDocument();
    expect(screen.getByTestId('directory-search-form')).toBeInTheDocument();
  });

  it('AT-SOC9-D-WEB-2: muestra taller-card cuando API retorna talleres', async () => {
    mockGet.mockResolvedValueOnce({ data: { talleres: MOCK_TALLERES } });
    render(<TalleresDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('taller-card-3')).toBeInTheDocument();
    });
    expect(screen.getByText('Arco Servicios')).toBeInTheDocument();
  });

  it('AT-SOC9-D-WEB-3: muestra directory-empty cuando lista vacía', async () => {
    mockGet.mockResolvedValueOnce({ data: { talleres: [] } });
    render(<TalleresDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('directory-empty')).toBeInTheDocument();
    });
  });

  it('AT-SOC9-D-WEB-4: muestra directory-error cuando la API falla', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    render(<TalleresDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('directory-error')).toBeInTheDocument();
    });
  });
});
