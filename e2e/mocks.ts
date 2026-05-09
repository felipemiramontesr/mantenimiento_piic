import { Page } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: API Mocking
 * Implementation: PIIC Sovereign Network Interceptor (v.1.0.0)
 *
 * Strategy: Intercepts all /v1 requests and returns predictable data.
 * This ensures E2E tests pass even if the real DB/API is offline.
 */
export default async function setupApiMocks(page: Page): Promise<void> {
  // Mock Login (intercepts both local and production URLs)
  await page.route(
    (url) => url.href.includes('/auth/login'),
    async (route) => {
      const body = route.request().postDataJSON();
      if (body.username === 'GrayMan' && body.password === 'Archon2026!') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            token: 'mock-jwt-token',
            user: {
              id: 1,
              username: 'GrayMan',
              fullName: 'Archon Master',
              roleId: 0,
              roleName: 'Master (Archon)',
              is_active: true,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Credenciales inválidas' }),
        });
      }
    }
  );

  // Mock Fleet List
  await page.route(
    (url) => url.href.includes('/fleet') && !url.href.includes('/auth'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          data: [
            {
              id: 'ASM-E2E',
              uuid: 'mock-uuid',
              marca: 'Toyota',
              modelo: 'Hilux',
              status: 'Disponible',
              placas: 'E2E-TEST',
            },
          ],
        }),
      });
    }
  );

  // Mock Catalogs
  await page.route(
    (url) => url.href.includes('/catalogs/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, label: 'Mock Category', code: 'MOCK' }]),
      });
    }
  );
}
