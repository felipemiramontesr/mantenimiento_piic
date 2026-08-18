import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

/**
 * FC162 F3 (100% mandatorio) — main.tsx (bootstrap) sin test previo. App
 * real se mockea para aislar el bootstrap en sí (createRoot + render en
 * #root), no el árbol de la aplicación (ya cubierto por App.test.tsx).
 */

vi.mock('./App', () => ({
  default: (): ReactElement => <div data-testid="app-mock">mounted</div>,
}));

describe('main.tsx bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
  });

  it('mounts App into the #root element via ReactDOM.createRoot', async () => {
    await import('./main');
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(
      document.getElementById('root')?.querySelector('[data-testid="app-mock"]')
    ).not.toBeNull();
  });
});
