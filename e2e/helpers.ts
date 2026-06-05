import { Page } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Helpers
 * Shared utilities for all E2E specs.
 */

/** Sets up API mocks + cookie consent, then logs in as GrayMan. */
export default async function loginAs(
  page: Page,
  username = 'GrayMan',
  password = 'Archon2026!'
): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('cookies_accepted', 'true');
  });
  await setupApiMocks(page);
  await page.goto('/login');
  await page.getByPlaceholder('ID de Archon').fill(username);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Acceder al Sistema/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
}
