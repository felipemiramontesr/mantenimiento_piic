import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useAssetTypeFields, DEFAULT_FIELD_VISIBILITY } from './useAssetTypeFields';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const ASSET_TYPES_FIXTURE = [
  {
    id: 1,
    code: 'VEHICLE',
    label: 'Vehículo',
    icon_name: 'truck',
    fields: { ...DEFAULT_FIELD_VISIBILITY },
  },
  {
    id: 2,
    code: 'EQUIPMENT',
    label: 'Equipo',
    icon_name: 'wrench',
    fields: { ...DEFAULT_FIELD_VISIBILITY, placa: false, circulationCardNumber: false },
  },
];

describe('useAssetTypeFields', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-ATF-1: returns matching asset type fields on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, count: 2, data: ASSET_TYPES_FIXTURE },
    });
    const { result } = renderHook(() => useAssetTypeFields(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fields).toEqual(ASSET_TYPES_FIXTURE[1].fields);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/catalogs/asset-types');
  });

  it('UT-ATF-2: falls back to DEFAULT_FIELD_VISIBILITY when no asset type matches', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, count: 2, data: ASSET_TYPES_FIXTURE },
    });
    const { result } = renderHook(() => useAssetTypeFields(999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fields).toEqual(DEFAULT_FIELD_VISIBILITY);
  });

  it('UT-ATF-3: degrades gracefully to DEFAULT_FIELD_VISIBILITY on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAssetTypeFields(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fields).toEqual(DEFAULT_FIELD_VISIBILITY);
  });
});
