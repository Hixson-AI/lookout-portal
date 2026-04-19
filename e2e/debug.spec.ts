import { test } from '@playwright/test';
import { authenticateAs } from './helpers/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const NEW_BUILDER_PATH = `/tenants/${TENANT_ID}/apps/new`;

test('debug blank screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
  await page.waitForTimeout(1500);
  await page.getByText('HTTP Request').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/after-step-add.png' });

  console.log('URL:', page.url());
  console.log('Errors:', JSON.stringify(errors));
  const body = await page.textContent('body') ?? '';
  console.log('Body (300):', body.slice(0, 300));
  // Check key elements
  const h1 = await page.$('h1');
  console.log('h1:', h1 ? await h1.textContent() : 'NOT FOUND');
  const buttons = await page.$$eval('button', els => els.map(e => e.textContent?.trim()).slice(0, 5));
  console.log('Buttons:', buttons);
  const rootHtml = await page.$eval('#root', el => el.innerHTML.slice(0, 500)).catch(() => 'no #root');
  console.log('Root HTML:', rootHtml);
});
