import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../../test/testUtils';
import api from '../../../../api/client';
import SecurityEventsCard from './SecurityEventsCard';
import { buildAbuseReport } from './abuseReport';
import { formatUtc } from './SecurityEventsTable';
import type { SecurityEvent } from './securityEventsApi';

/** FC201 F3 — tarjeta de eventos de seguridad de Ω (P3, P4). */

vi.mock('../../../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'https://apiv1.example.test/v1' },
  },
}));

const LIVE: SecurityEvent = {
  eventType: 'BAIT_ROUTE',
  ipHash: 'a'.repeat(64),
  ipAddress: '203.0.113.9',
  targetPattern: '/wp-admin/*',
  hits: 42,
  firstSeenUtc: '2026-09-30T20:00:00Z',
  lastSeenUtc: '2026-09-30T20:30:00Z',
};
const OLD: SecurityEvent = {
  ...LIVE,
  ipHash: 'b'.repeat(64),
  ipAddress: null,
  eventType: 'TRAP_FIELD',
};
const BLOCK = {
  ipHash: 'c'.repeat(64),
  ipAddress: '198.51.100.7',
  reason: 'escaneo',
  expiresUtc: '2026-10-01T20:00:00Z',
};

/** El `AuthProvider` de testUtils hace su propio POST /auth/refresh: los mocks van por URL. */
function givenDenyIp(outcome: 'ok' | 'fail'): void {
  vi.mocked(api.post).mockImplementation(async (url: string) => {
    if (url.endsWith('/deny-ip') && outcome === 'fail') throw new Error('400');
    return { data: { success: true } };
  });
}

function givenData(events: SecurityEvent[], blocks: (typeof BLOCK)[] = []): void {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { events, blocks } } });
}

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

describe('SecurityEventsCard', () => {
  it('lista los eventos; una IP seudonimizada no permite reporte ni bloqueo', async () => {
    givenData([LIVE, OLD]);
    render(<SecurityEventsCard />);

    const rows = await screen.findAllByTestId('security-event-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Ruta carnada');
    expect(rows[0]).toHaveTextContent('203.0.113.9');
    expect(rows[1]).toHaveTextContent('Seudonimizada');
    const [copyOld, blockOld] = rows[1].querySelectorAll('button');
    expect(copyOld).toBeDisabled();
    expect(blockOld).toBeDisabled();
  });

  it('copia el reporte de abuso con la IP, el vector y las fechas UTC', async () => {
    givenData([LIVE]);
    render(<SecurityEventsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /reporte de abuso/i }));

    await screen.findByRole('button', { name: /copiado/i });
    const report = writeText.mock.calls[0][0] as string;
    expect(report).toContain('Source IP: 203.0.113.9');
    expect(report).toContain('Target host: apiv1.example.test');
    expect(report).toContain('(/wp-admin/*)');
    expect(report).toContain('First seen (UTC): 2026-09-30T20:00:00Z');
  });

  it('"Bloquear" en una fila llena la IP; el alta envía IP, horas y motivo y recarga', async () => {
    givenData([LIVE]);
    givenDenyIp('ok');
    render(<SecurityEventsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /^bloquear$/i }));
    expect(screen.getByTestId('deny-ip-input')).toHaveValue('203.0.113.9');
    fireEvent.change(screen.getByTestId('deny-ip-reason'), { target: { value: 'escaneo' } });
    fireEvent.click(screen.getByTestId('deny-ip-submit'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/cosmology/security-events/deny-ip', {
        ip: '203.0.113.9',
        hours: 24,
        reason: 'escaneo',
      })
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('deny-ip-input')).toHaveValue('');
  });

  it('un alta rechazada muestra el error y conserva la IP', async () => {
    givenData([]);
    givenDenyIp('fail');
    render(<SecurityEventsCard />);

    fireEvent.change(await screen.findByTestId('deny-ip-input'), {
      target: { value: '999.1.1.1' },
    });
    fireEvent.click(screen.getByTestId('deny-ip-submit'));

    expect(await screen.findByText(/no se pudo bloquear/i)).toBeInTheDocument();
    expect(screen.getByTestId('deny-ip-input')).toHaveValue('999.1.1.1');
  });

  it('revoca un bloqueo vigente y recarga; si falla, lo dice', async () => {
    givenData([], [BLOCK]);
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('500'));
    render(<SecurityEventsCard />);

    expect(await screen.findByTestId('active-block-row')).toHaveTextContent('198.51.100.7');
    fireEvent.click(screen.getByRole('button', { name: /revocar/i }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(
        `/cosmology/security-events/deny-ip/${'c'.repeat(64)}`
      )
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));

    fireEvent.click(await screen.findByRole('button', { name: /revocar/i }));
    expect(await screen.findByText(/no se pudo revocar/i)).toBeInTheDocument();
  });

  it('sin datos: estados vacíos; con error de red: mensaje de error', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: null } });
    const { unmount } = render(<SecurityEventsCard />);
    expect(await screen.findByTestId('security-events-empty')).toBeInTheDocument();
    expect(screen.getByTestId('active-blocks-empty')).toBeInTheDocument();
    unmount();

    vi.mocked(api.get).mockRejectedValueOnce(new Error('network'));
    render(<SecurityEventsCard />);
    expect(await screen.findByTestId('security-events-error')).toBeInTheDocument();
  });
});

describe('SecurityEventsCard — bordes', () => {
  it('si el portapapeles falla, la fila no se marca como copiada', async () => {
    givenData([LIVE]);
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<SecurityEventsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /reporte de abuso/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /copiado/i })).toBeNull();
  });

  it('con una URL base inválida el reporte usa el host de la página', async () => {
    givenData([LIVE]);
    const original = api.defaults.baseURL;
    api.defaults.baseURL = 'no-es-una-url';
    render(<SecurityEventsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /reporte de abuso/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain(`Target host: ${window.location.host}`);
    api.defaults.baseURL = original;
  });

  it('un bloqueo seudonimizado y sin motivo se muestra sin romper la lista', async () => {
    givenData([], [{ ...BLOCK, ipAddress: null, reason: null }]);
    render(<SecurityEventsCard />);

    const row = await screen.findByTestId('active-block-row');
    expect(row).toHaveTextContent('Seudonimizada');
    expect(row).toHaveTextContent('—');
  });

  it('desmontar con la petición en vuelo no toca el estado (éxito y error)', async () => {
    let resolveGet: (v: unknown) => void = () => undefined;
    let rejectGet: (e: unknown) => void = () => undefined;
    vi.mocked(api.get)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGet = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((_r, reject) => {
            rejectGet = reject;
          })
      );

    render(<SecurityEventsCard />).unmount();
    render(<SecurityEventsCard />).unmount();
    resolveGet({ data: { success: true, data: { events: [LIVE], blocks: [] } } });
    rejectGet(new Error('late'));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('security-events-card')).toBeNull();
  });
});

describe('formatUtc', () => {
  it('muestra la hora local de una fecha UTC válida y deja intacto un valor inválido', () => {
    expect(formatUtc('2026-09-30T20:00:00Z')).not.toBe('2026-09-30T20:00:00Z');
    expect(formatUtc('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('buildAbuseReport', () => {
  it('no incluye datos internos: ni hash, ni catálogo, ni tipo interno', () => {
    const report = buildAbuseReport(LIVE, '203.0.113.9', 'apiv1.example.test');
    expect(report).toContain('Source IP: 203.0.113.9');
    expect(report).not.toContain(LIVE.ipHash);
    expect(report).not.toMatch(/BAIT_ROUTE|honeypot|carnada/i);
  });
});
