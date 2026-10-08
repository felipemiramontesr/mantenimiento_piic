import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import PwaUpdateBanner from './PwaUpdateBanner';
import { PWA_UPDATE_INTERVAL_MS, startUpdateChecks } from './usePwaUpdateNotifier';

/**
 * FC206 F3 (Escenario 9 · Invariante 4) — la PWA revisa cada 30 min y al volver a la pestaña, y
 * OFRECE la versión nueva sin recargar sola.
 */

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }));

type RegisterOptions = {
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
};

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn();

/** El módulo virtual con o sin versión en espera; devuelve las opciones que recibió. */
function givenServiceWorker(needRefresh: boolean): { options: () => RegisterOptions } {
  let received: RegisterOptions = {};
  vi.mocked(useRegisterSW).mockImplementation((options?: RegisterOptions) => {
    received = options ?? {};
    return {
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    };
  });
  return { options: () => received };
}

beforeEach(() => {
  updateServiceWorker.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PwaUpdateBanner', () => {
  it('sin versión en espera no muestra nada', () => {
    givenServiceWorker(false);
    render(<PwaUpdateBanner />);
    expect(screen.queryByTestId('pwa-update-banner')).not.toBeInTheDocument();
  });

  it('con versión en espera muestra el aviso, sin recargar por su cuenta', () => {
    givenServiceWorker(true);
    render(<PwaUpdateBanner />);
    expect(screen.getByTestId('pwa-update-banner')).toHaveTextContent(
      'Nueva versión de Archon disponible'
    );
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('«Actualizar ahora» activa el service worker nuevo (recarga controlada)', () => {
    givenServiceWorker(true);
    render(<PwaUpdateBanner />);
    fireEvent.click(screen.getByTestId('pwa-update-now'));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('si la activación falla, no rompe la página', async () => {
    givenServiceWorker(true);
    updateServiceWorker.mockRejectedValueOnce(new Error('sin red'));
    render(<PwaUpdateBanner />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('pwa-update-now'));
    });
    expect(screen.getByTestId('pwa-update-banner')).toBeInTheDocument();
  });

  it('«Descartar» oculta el aviso', () => {
    givenServiceWorker(true);
    render(<PwaUpdateBanner />);
    fireEvent.click(screen.getByTestId('pwa-update-dismiss'));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('al registrarse el service worker arranca las revisiones; sin registro no hace nada', () => {
    vi.useFakeTimers();
    const sw = givenServiceWorker(false);
    render(<PwaUpdateBanner />);
    const registration = { update: vi.fn().mockResolvedValue(undefined) };
    sw.options().onRegisteredSW?.('/sw.js', undefined);
    sw.options().onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);
    vi.advanceTimersByTime(PWA_UPDATE_INTERVAL_MS);
    expect(registration.update).toHaveBeenCalledTimes(1);
  });
});

describe('startUpdateChecks', () => {
  function setVisibility(state: 'visible' | 'hidden'): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  }

  it('revisa cada 30 minutos, al volver visible la pestaña y al recuperar el foco', () => {
    vi.useFakeTimers();
    const registration = { update: vi.fn().mockResolvedValue(undefined) };
    const stop = startUpdateChecks(registration);

    vi.advanceTimersByTime(PWA_UPDATE_INTERVAL_MS - 1);
    expect(registration.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(registration.update).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('focus'));
    expect(registration.update).toHaveBeenCalledTimes(3);

    stop();
    vi.advanceTimersByTime(PWA_UPDATE_INTERVAL_MS);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it('sin red, la revisión fallida no lanza (se reintenta en la siguiente)', async () => {
    const registration = { update: vi.fn().mockRejectedValue(new Error('offline')) };
    const stop = startUpdateChecks(registration);
    window.dispatchEvent(new Event('focus'));
    await Promise.resolve();
    expect(registration.update).toHaveBeenCalledTimes(1);
    stop();
  });
});
