/**
 * Mobile smoke spec — verifies key portal routes render at iPhone-SE width
 * without horizontal page overflow.
 *
 * Requires the dev server running at the playwright `baseURL` and (for
 * authenticated routes) the same JWT_SECRET / TENANT_ID values used by the
 * other e2e specs in this folder.
 */

import { test, expect, devices } from '@playwright/test';
import { authenticateAs } from './helpers/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const PHONE = devices['iPhone SE'];

test.use({
  viewport: PHONE.viewport,
  userAgent: PHONE.userAgent,
  isMobile: PHONE.isMobile,
  hasTouch: PHONE.hasTouch,
  deviceScaleFactor: PHONE.deviceScaleFactor,
});

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  // Allow 1px slack for sub-pixel rendering.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  );
}

test.describe('mobile smoke (iPhone SE)', () => {
  test('login page has no horizontal overflow', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalOverflow(page);
  });

  test('home page has no horizontal overflow when authenticated', async ({ page }) => {
    await authenticateAs(page, '/', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      isSystemAdmin: true,
    });
    await expectNoHorizontalOverflow(page);
  });

  test('tenants list has no horizontal overflow', async ({ page }) => {
    await authenticateAs(page, '/tenants', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      isSystemAdmin: true,
    });
    await expectNoHorizontalOverflow(page);
  });

  test('platform admin has no horizontal overflow', async ({ page }) => {
    await authenticateAs(page, '/platform', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      isSystemAdmin: true,
    });
    await expectNoHorizontalOverflow(page);
  });

  test('mobile nav drawer opens', async ({ page }) => {
    await authenticateAs(page, '/', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      isSystemAdmin: true,
    });
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByRole('button', { name: /close menu/i })).toBeVisible();
  });
});
