/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceGridView from './MaintenanceGridView';

const noop = (): void => undefined;

const ACTIVE_LOG = {
  id: 1,
  uuid: 'uuid-active-001',
  unit_id: 'ASM-001',
  service_date: '2026-05-29',
  odometer_at_service: 50000,
  service_type: 'ADVANCED_50K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'ADVANCED_50K',
  cost: 4500,
  technician: 'Carlos López',
  created_at: '2026-05-29T10:00:00Z',
  start_at: '2026-05-29T08:00:00Z',
  end_at: null,
  movement_status: 'ACTIVE',
};

const COMPLETED_LOG = {
  id: 2,
  uuid: 'uuid-completed-002',
  unit_id: 'ASM-010',
  service_date: '2026-05-28',
  odometer_at_service: 30000,
  service_type: 'MAJOR_30K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'MAJOR_30K',
  cost: 6000,
  technician: 'Ana Martínez',
  created_at: '2026-05-28T09:00:00Z',
  start_at: '2026-05-28T07:00:00Z',
  end_at: '2026-05-28T16:00:00Z',
  movement_status: 'COMPLETED',
};

describe('MaintenanceGridView', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [ACTIVE_LOG, COMPLETED_LOG], nextCursor: null })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('shows loading state initially', () => {
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onNewRequest={noop}
        onCompleteRequest={noop}
        onDetailRequest={noop}
      />
    );
    expect(screen.getByText(/sincronizando/i)).toBeInTheDocument();
  });

  it('renders maintenance logs after fetch', async () => {
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onNewRequest={noop}
        onCompleteRequest={noop}
        onDetailRequest={noop}
      />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    expect(screen.getAllByText('ASM-010').length).toBeGreaterThan(0);
  });

  it('shows empty state when no records exist', async () => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onNewRequest={noop}
        onCompleteRequest={noop}
        onDetailRequest={noop}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron registros/i)).toBeInTheDocument()
    );
  });

  it('calls onCompleteRequest when Finalizar button is clicked on ACTIVE row', async () => {
    let called = false;
    const handleComplete = (): void => {
      called = true;
    };
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onNewRequest={noop}
        onCompleteRequest={handleComplete}
        onDetailRequest={noop}
      />
    );
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());
    const btn = screen.getByRole('button', { name: /finalizar/i });
    fireEvent.click(btn);
    expect(called).toBe(true);
  });

  it('clicking on a COMPLETED row triggers onDetailRequest', async () => {
    let calledWith: unknown = null;
    const handleDetail = (log: unknown): void => {
      calledWith = log;
    };
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onNewRequest={noop}
        onCompleteRequest={noop}
        onDetailRequest={handleDetail}
      />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-010').length).toBeGreaterThan(0));
    // Click the completed row — GridView calls onDetailRequest via row onClick
    const completedUnitText = screen.getAllByText('ASM-010')[0];
    fireEvent.click(completedUnitText.closest('tr') || completedUnitText);
    expect(calledWith).toBeTruthy();
  });
});
