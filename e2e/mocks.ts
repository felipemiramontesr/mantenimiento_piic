import { Page } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: API Mocking
 * Implementation: PIIC Sovereign Network Interceptor (v.1.1.0)
 *
 * Strategy: Stateful interception to validate Forensic Parity.
 */
export default async function setupApiMocks(page: Page): Promise<void> {
  // 🧠 State Tracking
  let asm006Odometer = 357900;

  // 🔐 Mock Login
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
              roleId: 0,
              roleName: 'Master (Archon)',
              is_active: true,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Credenciales inválidas' }),
        });
      }
    }
  );

  // 🏥 Mock Fleet Inventory
  await page.route(
    (url) =>
      url.href.includes('/fleet') && !url.href.includes('/routes') && !url.href.includes('/auth'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 2,
          data: [
            {
              id: 'ASM-006',
              uuid: 'uuid-006',
              marca: 'Nissan',
              modelo: 'Frontier',
              status: 'Disponible',
              odometer: asm006Odometer,
              lastFuelLevel: 100,
            },
            {
              id: 'ASM-001',
              uuid: 'uuid-001',
              marca: 'Toyota',
              modelo: 'Hilux',
              status: 'En Ruta',
              odometer: 100000,
              lastFuelLevel: 80,
            },
          ],
        }),
      });
    }
  );

  // 📜 Mock Forensic Journal (Routes)
  await page.route(
    (url) => url.href.includes('/routes'),
    async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              uuid: 'route-uuid-1',
              unit_id: 'ASM-006',
              status: 'COMPLETED',
              start_reading: 350000,
              end_reading: asm006Odometer,
              fuel_level_end: 95,
              destination: 'Mina 1',
              driver_name: 'Adriana Mendoza',
              end_at: '2026-05-10T22:00:00Z',
            },
          ]),
        });
      } else if (method === 'PATCH') {
        const body = route.request().postDataJSON();
        if (body.endReading) {
          asm006Odometer = body.endReading;
        }
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      }
    }
  );

  // 📁 Mock Catalogs
  await page.route(
    (url) => url.href.includes('/catalogs/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: 1, label: 'General', code: 'GEN' }]),
      });
    }
  );
}
