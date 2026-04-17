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
      data: { id: 'FL-MOCK-001', ...data },
    });
  }),

  // Handler for GET /fleet (List)
  http.get('*/fleet', () =>
    HttpResponse.json({
      success: true,
      data: [],
    })
  ),
];

export default handlers;
