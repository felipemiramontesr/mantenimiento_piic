import { RowDataPacket } from 'mysql2';
import db from './db';

export interface AssetType {
  id: number;
  code: string;
  label: string;
  icon_name: string;
}

export type FieldVisibility = Record<string, boolean>;

/**
 * Fields that exist on every vehicle unit and are visible by default.
 * Absence of a row in asset_type_fields means visible=true.
 */
export const VEHICLE_FIELDS = [
  'placa',
  'circulationCardNumber',
  'numeroSerie',
  'insurancePolicyNumber',
  'insuranceExpiryDate',
  'vencimientoVerificacion',
  'warrantyExpiry',
] as const;

interface AssetTypeRow extends AssetType, RowDataPacket {}
interface HiddenFieldRow extends RowDataPacket {
  field_name: string;
  visible: number;
}

export async function getAssetTypes(): Promise<AssetType[]> {
  const [rows] = await db.execute<AssetTypeRow[]>(
    'SELECT id, code, label, icon_name FROM catalog_asset_types ORDER BY id'
  );
  return rows;
}

/**
 * Returns a field→boolean map for the given asset type.
 * Fields absent from asset_type_fields are assumed visible=true (VEHICLE default).
 */
export async function getFieldVisibility(assetTypeId: number): Promise<FieldVisibility> {
  const visibility: FieldVisibility = Object.fromEntries(VEHICLE_FIELDS.map((f) => [f, true]));

  const [rows] = await db.execute<HiddenFieldRow[]>(
    'SELECT field_name, visible FROM asset_type_fields WHERE asset_type_id = ?',
    [assetTypeId]
  );

  rows.forEach((row) => {
    visibility[row.field_name] = Boolean(row.visible);
  });

  return visibility;
}
