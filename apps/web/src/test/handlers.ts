import { http, HttpResponse } from 'msw';
import { CreateFleetUnit } from '../types/fleet';

/**
 * 🔱 Archon Test Infrastructure: MSW Handlers
 * Implementation: PIIC Sovereign Mocking (v.17.0.0)
 */
const handlers = [
  // Handler for POST /fleet (Registration)
  http.post('*/fleet', async ({ request }) => {
    const data = (await request.json()) as CreateFleetUnit;

    // Simulate server-side validation error for specific mock cases if needed
    if (!data) {
      return HttpResponse.json({ success: false, error: 'Payload missing' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      data: { ...data },
    });
  }),

  // Handler for GET /fleet (List)
  http.get('*/fleet', () =>
    HttpResponse.json({
      success: true,
      data: [],
    })
  ),

  // 📐 Handlers for Dynamic Catalogs
  http.get('*/catalogs/:category', ({ params, request }) => {
    const { category } = params;
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId');

    if (category === 'BRAND') {
      return HttpResponse.json([
        { id: 101, label: 'Toyota', code: 'V_TOYOTA' },
        { id: 102, label: 'Nissan', code: 'V_NISSAN' },
      ]);
    }

    if (category === 'MODEL') {
      if (parentId === '101') {
        return HttpResponse.json([
          { id: 201, label: 'Hilux', code: 'V_HILUX' },
          { id: 202, label: 'Tacoma', code: 'V_TACOMA' },
        ]);
      }
      return HttpResponse.json([{ id: 203, label: 'Generic Model', code: 'G_MODEL' }]);
    }

    if (category === 'FREQ_TIME') {
      return HttpResponse.json([
        { id: 301, label: 'Diaria', code: 'T_DIARIA' },
        { id: 302, label: 'Mensual', code: 'T_MENSUAL' },
      ]);
    }

    if (category === 'FREQ_USAGE') {
      return HttpResponse.json([
        { id: 401, label: '5,000 KM', code: 'U_5K_KM' },
        { id: 402, label: '10,000 KM', code: 'U_10K_KM' },
      ]);
    }

    if (category === 'ASSET_TYPE') {
      return HttpResponse.json([
        { id: 1, label: 'Vehículo', code: 'AT_VEH' },
        { id: 2, label: 'Maquinaria', code: 'AT_MAQ' },
        { id: 3, label: 'Herramienta', code: 'AT_HER' },
      ]);
    }

    return HttpResponse.json([]);
  }),

  // 🔱 Sentinel Incidents Handlers
  http.get('*/incidents', () =>
    HttpResponse.json({
      success: true,
      data: [],
    })
  ),

  http.post('*/routes/:uuid/incidents', () =>
    HttpResponse.json({
      success: true,
      message: 'Incident reported',
    })
  ),

  // 🛡️ Identity Handlers
  http.get('*/auth/users', () =>
    HttpResponse.json({
      success: true,
      data: [],
    })
  ),

  http.get('*/auth/roles', () =>
    HttpResponse.json({
      success: true,
      data: [],
    })
  ),
];

export default handlers;
