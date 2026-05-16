/* eslint-disable */

const transformUnits = (raw: any): any[] => {
  const data = Array.isArray(raw) ? raw : [];

  const assetTypeMap: Record<number, string> = {
    1: 'Vehiculo',
    2: 'Maquinaria',
    3: 'Herramienta',
  };

  return data.map((item: any) => {
    const unit = item;
    const getVal = (camel: string, snake: string): any =>
      unit[camel] !== undefined ? unit[camel] : unit[snake];

    const normalizedUnit: any = {
      ...unit,
      assetTypeId: getVal('assetTypeId', 'asset_type_id'),
    };

    return {
      ...normalizedUnit,
      assetType: normalizedUnit.assetType || assetTypeMap[normalizedUnit.assetTypeId] || 'S/D',
    };
  });
};

const mockRawData = [
  { id: 'ASM-002', assetTypeId: 1, assetType: 'Vehículo' },
  { id: 'ASM-008', asset_type_id: 2 }
];

console.log('Result:', JSON.stringify(transformUnits(mockRawData), null, 2));

const mockWrappedData = { success: true, data: mockRawData };
// This mimics how freshData is extracted in useSilkHydration
let freshData = (mockWrappedData as any).data || mockWrappedData || [];
console.log('Wrapped Result:', JSON.stringify(transformUnits(freshData), null, 2));
