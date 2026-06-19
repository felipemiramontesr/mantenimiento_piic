/* eslint-disable */
// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import UniversesDirectory from './UniversesDirectory';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

/**
 * UniversesDirectory — Archon_Onboarding_UniversesDirectory Fase 2
 *
 * UD-1: renders loading skeleton initially
 * UD-2: renders table rows on success
 * UD-3: renders empty state when list is empty
 * UD-4: renders error state on API failure
 * UD-5: calls onBack when back button is clicked
 */

const MOCK_ROWS = [
  {
    owner_id: 1,
    owner_type: 'FLOTILLA',
    suite: 'ERP',
    label: 'PIIC SA de CV',
    user_id: 10,
    username: 'piic.flotilla',
    full_name: 'PIIC Flotilla',
    is_active: 1,
    rfc: 'PIIC123456ABC',
    razon_social: 'PIIC SA de CV',
    telefono: '5551234567',
  },
  {
    owner_id: 2,
    owner_type: 'CENTER',
    suite: 'VIM',
    label: 'Taller Centro',
    user_id: 20,
    username: 'taller.centro',
    full_name: 'Taller Centro',
    is_active: 0,
    rfc: null,
    razon_social: null,
    telefono: null,
  },
];

describe('UniversesDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UD-1: renders loading skeleton initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<UniversesDirectory />);
    expect(screen.getByTestId('universes-directory-loading')).toBeInTheDocument();
  });

  it('UD-2: renders table rows on success', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: MOCK_ROWS } });
    render(<UniversesDirectory />);

    await waitFor(() => {
      expect(screen.getByTestId('universes-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('universe-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('universe-row-2')).toBeInTheDocument();
    expect(screen.getByText('PIIC SA de CV')).toBeInTheDocument();
    expect(screen.getByText('piic.flotilla')).toBeInTheDocument();
    expect(screen.getByText('PIIC123456ABC')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    // row 2: no razon_social → label fallback; rfc null → '—'
    expect(screen.getByText('Taller Centro')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    // Suite badges
    expect(screen.getByText('ERP')).toBeInTheDocument();
    expect(screen.getByText('VIM')).toBeInTheDocument();
  });

  it('UD-3: renders empty state when list is empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });
    render(<UniversesDirectory />);

    await waitFor(() => {
      expect(screen.getByTestId('universes-directory-empty')).toBeInTheDocument();
    });
  });

  it('UD-4: renders error state on API failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network error'));
    render(<UniversesDirectory />);

    await waitFor(() => {
      expect(screen.getByTestId('universes-directory-error')).toBeInTheDocument();
    });
  });

  it('UD-5: has no back button — navigation handled by sovereign header', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });
    render(<UniversesDirectory />);

    await waitFor(() => {
      expect(screen.getByTestId('universes-directory-empty')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('universes-directory-back')).not.toBeInTheDocument();
  });
});
