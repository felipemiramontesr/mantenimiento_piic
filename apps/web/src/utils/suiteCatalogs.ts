export type Suite = 'VIM' | 'ERP';

// Mirrors apps/api/src/constants/suiteCatalogs.ts SUITE_EXCLUSIVE.
// Categories exclusive to one suite must be blocked for the other.
// Categories absent from both suites (e.g. ENVIRONMENTAL_HOLOGRAM) are NOT blocked.
const SUITE_EXCLUSIVE_CATEGORIES: Record<Suite, ReadonlySet<string>> = {
  VIM: new Set<string>(['SPECIALTY']),
  ERP: new Set<string>(['FLEET_AREA']),
};

export function isCategoryBlockedForSuite(suite: Suite, category: string): boolean {
  const otherSuite: Suite = suite === 'VIM' ? 'ERP' : 'VIM';
  return SUITE_EXCLUSIVE_CATEGORIES[otherSuite].has(category);
}

export function filterAllowedCategories(suite: Suite, categories: string[]): string[] {
  return categories.filter((cat) => !isCategoryBlockedForSuite(suite, cat));
}
