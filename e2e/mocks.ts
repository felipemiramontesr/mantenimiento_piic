import { Page } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: API Mocking (v.2.0.0)
 * Implementation: PIIC Sovereign Network Interceptor
 *
 * Strategy: Stateful interception scoped to API port (:3001) only.
 * All Vite asset requests (localhost:5173) pass through unintercepted.
 * All mocks include permissions:[*] so RBAC guards pass in local mode.
 */

// Only match requests to the API server — never intercept Vite asset requests
const isApi = (url: URL): boolean => url.port === '3001';

// ─── Mock data fixtures ────────────────────────────────────────────────────────

export const FLEET_FIXTURE = [
  {
    id: 'ASM-E2E',
    uuid: 'uuid-e2e-0001',
    marca: 'Toyota',
    modelo: 'Hilux',
    status: 'Disponible',
    odometer: 45000,
    nextServiceReading: 50000,
    nextServiceReading_forecast: 50000,
    lastFuelLevel: 90,
    year: 2023,
    placas: 'ABC-123',
    numeroSerie: 'SN-001',
    departamento: 'Logística',
    assetType: 'Vehículo',
    healthScore: 92,
    availabilityIndex: 98,
    maintIntervalKm: 10000,
  },
  {
    id: 'ASM-006',
    uuid: 'uuid-asm-006',
    marca: 'Nissan',
    modelo: 'Frontier',
    status: 'Disponible',
    odometer: 357900,
    nextServiceReading: 360000,
    nextServiceReading_forecast: 360000,
    lastFuelLevel: 100,
    year: 2021,
    placas: 'XYZ-987',
    numeroSerie: 'SN-006',
    departamento: 'Operaciones',
    assetType: 'Vehículo',
    healthScore: 88,
    availabilityIndex: 95,
    maintIntervalKm: 10000,
  },
];

export const USERS_FIXTURE = [
  {
    id: 1,
    uuid: 'uuid-grayman-001',
    username: 'GrayMan',
    fullName: 'Felipe Miramontes',
    email: 'admin@piic.com',
    roleId: 0,
    roleName: 'Master (Archon)',
    department: 'IT',
    employeeNumber: 'EMP-001',
    is_active: true,
    imageUrl: null,
  },
  {
    id: 2,
    uuid: 'uuid-operator-002',
    username: 'acarrillo',
    fullName: 'Ana Carrillo',
    email: 'acarrillo@piic.com',
    roleId: 3,
    roleName: 'Operador de Unidad',
    department: 'Operaciones',
    employeeNumber: 'EMP-002',
    is_active: true,
    imageUrl: null,
  },
];

export const INCIDENTS_FIXTURE = [
  {
    id: 1,
    uuid: 'inc-uuid-0001',
    route_uuid: 'route-uuid-1',
    unit_id: 'ASM-E2E',
    driver_name: 'Ana Carrillo',
    category: 'MECANICA',
    description: 'Falla en suspensión delantera detectada en ruta',
    severity: 'LOW',
    status: 'RESOLVED',
    evidence_image: null,
    reported_at: '2026-05-15T10:00:00.000Z',
  },
];

export const MAINTENANCE_FORECAST_FIXTURE = [
  {
    unitId: 'ASM-006',
    marca: 'Nissan',
    modelo: 'Frontier',
    departamento: 'Operaciones',
    currentOdometer: 357900,
    dailyUsageAvg: 80,
    nextKmReading: 360000,
    kmRemaining: 2100,
    nextServiceDate: '2026-07-01',
    daysUntilService: 27,
    triggerType: 'KM',
    projectedOdometer: 360000,
    projectedServiceType: 'BASIC_10K',
    urgency: 'MEDIUM',
  },
];

// ─── Main mock setup ───────────────────────────────────────────────────────────

export default async function setupApiMocks(page: Page): Promise<void> {
  // 🔐 Auth: Login
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/auth/login'),
    async (route) => {
      const body = route.request().postDataJSON();
      if (body?.username === 'GrayMan' && body?.password === 'Archon2026!') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            token: 'mock-jwt-token-e2e',
            user: {
              id: 1,
              uuid: 'uuid-grayman-001',
              username: 'GrayMan',
              roleId: 0,
              roleName: 'Master (Archon)',
              is_active: true,
              permissions: [
                'fleet:view',
                'fleet:write',
                'maint:view',
                'maint:write',
                'route:view',
                'route:write',
                'user:admin',
                'financial:view',
              ],
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

  // 👥 Auth: Users list
  await page.route(
    (url) =>
      isApi(url) &&
      url.pathname.includes('/auth/users') &&
      !url.pathname.includes('/login') &&
      !url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_FIXTURE }),
      });
    }
  );

  // 👥 Auth: User node
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/auth/users/') && url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              ...USERS_FIXTURE[0],
              profile_picture_url: null,
              department_name: 'IT',
              employee_number: 'EMP-001',
              last_login: '2026-06-04T10:00:00.000Z',
              created_at: '2024-01-01T00:00:00.000Z',
            },
            permissions: [
              { slug: 'fleet:view', description: 'Ver flota' },
              { slug: 'user:admin', description: 'Gestionar usuarios' },
            ],
            recentRoutes: [],
          },
        }),
      });
    }
  );

  // 👥 Auth: Roles
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/auth/roles'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 0, name: 'Master (Archon)' },
            { id: 1, name: 'Gerente de Operaciones' },
            { id: 3, name: 'Operador de Unidad' },
          ],
        }),
      });
    }
  );

  // 🚗 Fleet: inventory
  await page.route(
    (url) => isApi(url) && url.pathname.startsWith('/v1/fleet') && !url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: FLEET_FIXTURE.length, data: FLEET_FIXTURE }),
      });
    }
  );

  // 🚗 Fleet: node detail
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/fleet/') && url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            unit: {
              ...FLEET_FIXTURE[0],
              owner: 'PIIC SA de CV',
              uso: 'Carga',
              accountingAccount: '1.1.2.01',
              motor: '2.5L',
              fuelType: 'Diesel',
              traccion: '4x4',
              transmision: 'Automática',
              tireSpec: '265/70R17',
              capacidadCarga: 1500,
              fuelTankCapacity: 80,
              maintIntervalDays: 90,
              dailyUsageAvg: 42,
              lastServiceDate: '2026-01-15',
              lastServiceReading: 40000,
              nextServiceReading: 50000,
              healthStatus: 'Bueno',
              mtbfHours: 720,
              mttrHours: 4,
              backlogCount: 0,
              images: [],
            },
            maintenance: { recentHistory: [] },
            financial: { year: 2026, totalCost: 0, byCategory: {} },
            incidents: { recent: [], openCount: 0 },
          },
        }),
      });
    }
  );

  // 🛣️ Routes: list
  await page.route(
    (url) =>
      isApi(url) &&
      url.pathname.startsWith('/v1/routes') &&
      !url.pathname.includes('/incidents') &&
      !url.pathname.includes('/node'),
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
                end_reading: 357900,
                fuel_level_start: 100,
                fuel_level_end: 95,
                destination: 'Mina Norte',
                driver_name: 'Ana Carrillo',
                driver_id: 2,
                start_at: '2026-05-10T08:00:00Z',
                end_at: '2026-05-10T22:00:00Z',
                created_at: '2026-05-10T07:45:00Z',
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, routeUuid: 'route-new-uuid' }),
        });
      }
    }
  );

  // 🛣️ Routes: node detail
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/routes/') && url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            route: {
              uuid: 'route-uuid-1',
              unit_id: 'ASM-006',
              status: 'COMPLETED',
              start_reading: 350000,
              end_reading: 357900,
              start_at: '2026-05-10T08:00:00Z',
              end_at: '2026-05-10T22:00:00Z',
              fuel_level_start: 100,
              fuel_level_end: 95,
              fuel_liters_loaded: null,
              fuel_amount: null,
              fuel_ticket_image: null,
              additives_check: 0,
              tire_pressure_json: null,
              checklist_json: null,
              description: null,
              created_at: '2026-05-10T07:45:00Z',
              driver_id: 2,
              destination: 'Mina Norte',
              driver_name: 'Ana Carrillo',
              driver_role: 'Operador',
              unit_marca: 'Nissan',
              unit_modelo: 'Frontier',
              unit_year: 2021,
            },
            incidents: [],
          },
        }),
      });
    }
  );

  // 🚨 Routes: incidents
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/routes/') && url.pathname.includes('/incidents'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );

  // 🚨 Incidents: list
  await page.route(
    (url) =>
      isApi(url) && url.pathname.startsWith('/v1/incidents') && !url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: INCIDENTS_FIXTURE }),
      });
    }
  );

  // 🚨 Incidents: node detail
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/incidents/') && url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...INCIDENTS_FIXTURE[0],
            unit_marca: 'Toyota',
            unit_modelo: 'Hilux',
            unit_year: 2023,
            route_start: '2026-05-15T08:00:00.000Z',
            route_end: '2026-05-15T18:00:00.000Z',
            destination: 'Mina Norte',
            driver_name: 'Ana Carrillo',
          },
        }),
      });
    }
  );

  // 🔧 Maintenance: list
  await page.route(
    (url) =>
      isApi(url) &&
      url.pathname.startsWith('/v1/maintenance') &&
      !url.pathname.includes('/forecast') &&
      !url.pathname.includes('/node') &&
      !url.pathname.includes('/template'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], nextCursor: null }),
      });
    }
  );

  // 🔧 Maintenance: forecast
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/maintenance/forecast'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MAINTENANCE_FORECAST_FIXTURE }),
      });
    }
  );

  // 🔧 Maintenance: node detail
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/maintenance/') && url.pathname.includes('/node'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            order: {
              uuid: 'maint-uuid-e2e',
              unit_id: 'ASM-006',
              movement_status: 'COMPLETED',
              service_date: '2026-05-01',
              odometer_at_service: 350000,
              odometer_at_close: 350010,
              fuel_level_start: 80,
              fuel_level_end: 75,
              fuel_liters_loaded: 0,
              fuel_amount: 0,
              service_type: 'BASIC_10K',
              service_mode: 'WORKSHOP',
              system_recommended_type: 'BASIC_10K',
              cost: 3500,
              technician: 'Carlos López',
              created_at: '2026-05-01T08:00:00Z',
              start_at: '2026-05-01T08:00:00Z',
              end_at: '2026-05-01T16:00:00Z',
              details: [
                {
                  taskCode: 'OIL_CHANGE',
                  status: 'PASS',
                  notes: null,
                  label: 'Cambio de aceite',
                  isCritical: true,
                  statusLabel: 'OK',
                },
              ],
            },
            unit: FLEET_FIXTURE[1],
          },
        }),
      });
    }
  );

  // 🔧 Maintenance: template
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/maintenance/template'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tasks: [] }),
      });
    }
  );

  // 💰 Finance: dashboard
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/finance/dashboard'),
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
              totalEgresos: 125000,
              totalLease: 50000,
              totalMaintenance: 35000,
              totalFuel: 25000,
              totalInsurance: 15000,
              totalTire: 0,
              totalFine: 0,
              totalRepair: 0,
              totalOther: 0,
              unitCount: 2,
              avgCostPerUnit: 62500,
            },
            byCategory: [
              { category: 'LEASE', amount: 50000 },
              { category: 'MAINTENANCE', amount: 35000 },
            ],
            byMonth: [
              { period: '2026-01', amount: 20000 },
              { period: '2026-02', amount: 25000 },
            ],
            topUnits: [],
          },
        }),
      });
    }
  );

  // 💰 Finance: transactions
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/finance/transactions'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { nextCursor: null, total: 0 } }),
      });
    }
  );

  // 📁 Catalogs
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/catalogs'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, label: 'General', code: 'GEN' }] }),
      });
    }
  );

  // 🔔 Alerts
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/alerts'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 0, data: [] }),
      });
    }
  );

  // 📊 Audit logs
  await page.route(
    (url) => isApi(url) && (url.pathname.includes('/unit-logs') || url.pathname.includes('/logs')),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], total: 0 }),
      });
    }
  );

  // 🔐 Permissions (RBAC)
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/role-permissions'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );

  // 📍 Geolocation
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/geolocation'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );
}
