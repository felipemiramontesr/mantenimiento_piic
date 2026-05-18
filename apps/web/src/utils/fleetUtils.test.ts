/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { getInitialFleetForm } from './fleetUtils';

describe('fleetUtils (Fleet Logic)', () => {
  it('should return initial fleet form state', () => {
    const form = getInitialFleetForm();
    expect(form.status).toBe('Disponible');
    expect(form.id).toBe('');
    expect(form.images).toEqual([]);
  });
});
