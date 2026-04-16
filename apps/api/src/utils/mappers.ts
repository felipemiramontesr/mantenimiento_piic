// ⚡ ARCHON DATA MAPPERS (v.9.0.0)
// Centralized mapping logic for DB <-> API boundaries

/**
 * Automatically converts an object from camelCase (API) to snake_case (DB)
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  });
  return result;
}

/**
 * Automatically converts an object from snake_case (DB) to camelCase (API)
 */
export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    result[camelKey] = obj[key];
  });
  return result;
}
