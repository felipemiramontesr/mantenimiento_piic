export type Suite = 'VIM' | 'ERP';

const VIM_CATEGORIES = [
  'SPECIALTY',
  'ASSET_TYPE',
  'BRAND',
  'COMPLIANCE_STATUS',
  'DEPARTMENT',
  'DRIVE_TYPE',
  'ENGINE_TYPE',
  'FILTER_BRAND',
  'FLEET_OWNER',
  'FREQ_TIME',
  'FREQ_USAGE',
  'FUEL',
  'FUEL_TYPE',
  'INSURANCE_COMPANY',
  'LOCATION',
  'LUBE_BRAND',
  'MAINTENANCE_CENTER',
  'MAINT_FREQ_TIME',
  'MAINT_FREQ_USAGE',
  'MAINTENANCE_TIME_FREQ',
  'MAINTENANCE_USAGE_FREQ',
  'MODEL',
  'OPERATIONAL_USE',
  'ROUTE_ORIGIN',
  'TERRAIN_TYPE',
  'TIRE_BRAND',
  'TRANSMISSION',
  'VEHICLE_COLOR',
] as const;

const ERP_CATEGORIES = [
  'FLEET_AREA',
  'ASSET_TYPE',
  'BRAND',
  'COMPLIANCE_STATUS',
  'DEPARTMENT',
  'DRIVE_TYPE',
  'ENGINE_TYPE',
  'FILTER_BRAND',
  'FLEET_OWNER',
  'FREQ_TIME',
  'FREQ_USAGE',
  'FUEL',
  'FUEL_TYPE',
  'INSURANCE_COMPANY',
  'LOCATION',
  'LUBE_BRAND',
  'MAINTENANCE_CENTER',
  'MAINT_FREQ_TIME',
  'MAINT_FREQ_USAGE',
  'MAINTENANCE_TIME_FREQ',
  'MAINTENANCE_USAGE_FREQ',
  'MODEL',
  'OPERATIONAL_USE',
  'ROUTE_ORIGIN',
  'TERRAIN_TYPE',
  'TIRE_BRAND',
  'TRANSMISSION',
  'VEHICLE_COLOR',
] as const;

export const SUITE_CATALOG_CATEGORIES: Record<Suite, ReadonlySet<string>> = {
  VIM: new Set<string>(VIM_CATEGORIES),
  ERP: new Set<string>(ERP_CATEGORIES),
};

export function isCategoryAllowedForSuite(suite: Suite, category: string): boolean {
  return SUITE_CATALOG_CATEGORIES[suite].has(category);
}

// Categories that belong exclusively to one suite and must be blocked for the other.
// Categories absent from both suites (e.g. ENVIRONMENTAL_HOLOGRAM) are NOT blocked.
export const SUITE_EXCLUSIVE: Record<Suite, ReadonlySet<string>> = {
  VIM: new Set<string>(['SPECIALTY']),
  ERP: new Set<string>(['FLEET_AREA']),
};

export function isCategoryExclusiveToSuite(suite: Suite, category: string): boolean {
  return SUITE_EXCLUSIVE[suite].has(category);
}
