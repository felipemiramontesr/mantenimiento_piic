import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * FC211 F2 (D11 · D17 capa 1) — contrato de entrega de la PWA en los `.htaccess` de `public/`: los
 * archivos del ciclo de vida (nombre fijo) nunca se guardan en caché y los de `assets/` (nombre con
 * huella) son inmutables. La comprobación real es la de producción (`curl -I …/sw.js` con `no-cache`);
 * esta prueba evita que una edición quite las directivas sin que nadie lo note. Solo se usan
 * directivas básicas (`FilesMatch` + `Header set`): un `.htaccess` inválido tumbaría el sitio entero.
 */

/** Contenido de un `.htaccess` de `public/`. */
function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), 'public', relativePath), 'utf8');
}

const root = read('.htaccess');
const assets = read('assets/.htaccess');

describe('public/.htaccess — ciclo de vida de la PWA', () => {
  it('sw.js, manifest.webmanifest e index.html salen sin caché', () => {
    const opening = '<FilesMatch "^(sw\\.js|manifest\\.webmanifest|index\\.html)$">';
    const start = root.indexOf(opening);
    expect(start).toBeGreaterThan(0);
    const lifecycle = root.slice(start, root.indexOf('</FilesMatch>', start));
    expect(lifecycle).toContain('Header set Cache-Control "no-cache, no-store, must-revalidate"');
    expect(lifecycle).toContain('Header set Pragma "no-cache"');
  });

  it('no declara caché larga y conserva la reescritura de la SPA', () => {
    expect(root).not.toContain('max-age');
    expect(root).toContain('RewriteRule . /index.html [L]');
  });

  it('solo usa directivas básicas, dentro de IfModule', () => {
    expect(root).not.toMatch(/<If\s/);
    expect(root.match(/<IfModule /g)).toHaveLength(2);
  });
});

describe('public/assets/.htaccess — archivos con huella', () => {
  it('js y css son inmutables por un año', () => {
    expect(assets).toContain('<FilesMatch "\\.(js|css)$">');
    expect(assets).toContain('Header set Cache-Control "public, max-age=31536000, immutable"');
    expect(assets).toContain('<IfModule mod_headers.c>');
  });
});
