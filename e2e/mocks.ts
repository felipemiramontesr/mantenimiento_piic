import { Page } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: API Mocking
 * Implementation: PIIC Sovereign Network Interceptor (v.1.2.0)
 *
 * Strategy: Stateful interception to validate Forensic Parity.
 * All mocks include permissions:[*] so RBAC guards pass in local mode.
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
              permissions: ['*'],
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
          count: 3,
          data: [
            {
              id: 'ASM-E2E',
              uuid: 'uuid-e2e',
              marca: 'Toyota',
              modelo: 'Hilux',
              status: 'Disponible',
              odometer: 45000,
              nextServiceReading_forecast: 50000,
              lastFuelLevel: 90,
              year: 2023,
            },
            {
              id: 'ASM-006',
              uuid: 'uuid-006',
              marca: 'Nissan',
              modelo: 'Frontier',
              status: 'Disponible',
              odometer: asm006Odometer,
              nextServiceReading_forecast: 360000,
              lastFuelLevel: 100,
              year: 2021,
            },
            {
              id: 'ASM-001',
              uuid: 'uuid-001',
              marca: 'Toyota',
              modelo: 'Hilux',
              status: 'En Ruta',
              odometer: 100000,
              nextServiceReading_forecast: 105000,
              lastFuelLevel: 80,
              year: 2022,
            },
          ],
        }),
      });
    }
  );

  // 📜 Mock Forensic Journal (Routes & Incidents)
  await page.route(
    (url) => url.href.includes('/routes') && !url.href.includes('/auth'),
    async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
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
            ],
          }),
        });
      } else if (method === 'PATCH' || method === 'PUT') {
        const body = route.request().postDataJSON();
        if (body?.endReading) {
          asm006Odometer = body.endReading;
        }
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ success: true, routeUuid: 'route-new-uuid' }),
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

  // 🔔 Mock Alerts
  await page.route(
    (url) => url.href.includes('/alerts'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 0, data: [] }),
      });
    }
  );

  // 💰 Mock Finance Dashboard
  await page.route(
    (url) => url.href.includes('/finance/dashboard'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            from: '2026-01',
            to: '2026-06',
            kpis: {
              totalEgresos: 0,
              totalLease: 0,
              totalMaintenance: 0,
              totalFuel: 0,
              totalInsurance: 0,
              totalTire: 0,
              totalFine: 0,
              totalRepair: 0,
              totalOther: 0,
              unitCount: 3,
              avgCostPerUnit: 0,
            },
            byCategory: [],
            byMonth: [],
            topUnits: [],
          },
        }),
      });
    }
  );

  // 🔧 Mock Maintenance
  await page.route(
    (url) => url.href.includes('/maintenance'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], nextCursor: null }),
      });
    }
  );

  // 📍 Mock Geolocation
  await page.route(
    (url) => url.href.includes('/geolocation/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );

  // 📊 Mock Unit Logs & Incidents (catch-all for unmatched API calls)
  await page.route(
    (url) =>
      url.href.includes('/unit-logs') ||
      url.href.includes('/incidents') ||
      url.href.includes('/finance/transactions') ||
      url.href.includes('/finance/export'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );
}
