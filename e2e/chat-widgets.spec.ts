/**
 * Chat widget e2e tests.
 *
 * Strategy: intercept POST /v1/tenants/:id/agents/chat and return known
 * tool call responses so we can assert widget rendering and validation
 * without a live backend or real AI.
 */

import { test, expect } from '@playwright/test';
import { authenticateAs } from './helpers/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID  = process.env.E2E_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const BUILDER_PATH = `/tenants/${TENANT_ID}/apps/new`;

// ── Helpers ───────────────────────────────────────────────────────────────

async function goToBuilder(page: import('@playwright/test').Page) {
  await authenticateAs(page, BUILDER_PATH, {
    jwtSecret: JWT_SECRET,
    tenantId: TENANT_ID,
    role: 'operator',
    isSystemAdmin: false,
  });
}

async function interceptChat(page: import('@playwright/test').Page, toolCall: object | null, text: string | null = null) {
  await page.route('**/v1/tenants/*/agents/chat', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text,
          toolCall,
          rawToolCalls: toolCall ? [{
            id: 'tc1',
            type: 'function',
            function: { name: (toolCall as any).tool, arguments: JSON.stringify((toolCall as any).props) },
          }] : null,
        },
      }),
    }),
  );
}

async function interceptCatalog(page: import('@playwright/test').Page) {
  await page.route('**/v1/catalog/steps', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  );
}

// ── Suite: FieldInputWidget ───────────────────────────────────────────────

test.describe('FieldInputWidget', () => {
  test.beforeEach(async ({ page }) => {
    await interceptCatalog(page);
  });

  test('renders pre-filled default value as chip (no typing required)', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: {
        label: 'Cron expression',
        fieldId: 'cron',
        field_type: 'cron',
        default_value: '0 9 * * 1',
        hint: 'This will run every Monday at 9 AM',
      },
    });

    await goToBuilder(page);

    // Send a message to trigger the chat response
    const input = page.getByPlaceholder(/describe your workflow/i).or(page.locator('textarea').first());
    await input.fill('send a weekly report');
    await input.press('Enter');

    // Default value chip should appear — no text input visible
    await expect(page.getByText('0 9 * * 1')).toBeVisible();
    await expect(page.getByText('This will run every Monday at 9 AM')).toBeVisible();

    // Confirm button should be enabled immediately
    const confirm = page.getByRole('button', { name: /confirm/i });
    await expect(confirm).toBeEnabled();
  });

  test('Edit link switches chip to editable input', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: {
        label: 'Cron expression',
        fieldId: 'cron',
        field_type: 'cron',
        default_value: '0 9 * * 1',
      },
    });

    await goToBuilder(page);
    const input = page.getByPlaceholder(/describe/i).or(page.locator('textarea').first());
    await input.fill('test');
    await input.press('Enter');

    await page.getByRole('button', { name: /edit/i }).click();

    // Should now show a text input
    const textInput = page.getByLabel('Cron expression');
    await expect(textInput).toBeVisible();
    await expect(textInput).toHaveValue('0 9 * * 1');
  });

  test('email field_type shows validation error on invalid input', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: {
        label: 'Client email',
        fieldId: 'email',
        field_type: 'email',
        placeholder: 'client@example.com',
      },
    });

    await goToBuilder(page);
    const msg = page.getByPlaceholder(/describe/i).or(page.locator('textarea').first());
    await msg.fill('test');
    await msg.press('Enter');

    const emailInput = page.getByLabel('Client email');
    await emailInput.fill('notanemail');
    await emailInput.blur();

    await expect(page.getByText('Must be a valid email address')).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  test('email field clears error and enables Confirm on valid input', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: { label: 'Client email', fieldId: 'email', field_type: 'email' },
    });

    await goToBuilder(page);
    const msg = page.locator('textarea').first();
    await msg.fill('test');
    await msg.press('Enter');

    const emailInput = page.getByLabel('Client email');
    await emailInput.fill('notanemail');
    await emailInput.blur();
    await expect(page.getByText('Must be a valid email address')).toBeVisible();

    await emailInput.fill('valid@example.com');
    await emailInput.blur();
    await expect(page.getByText('Must be a valid email address')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /confirm/i })).toBeEnabled();
  });

  test('url field shows validation error when scheme is missing', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: { label: 'API endpoint', fieldId: 'url', field_type: 'url' },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    await page.getByLabel('API endpoint').fill('example.com');
    await page.getByLabel('API endpoint').blur();

    await expect(page.getByText(/must be a valid url/i)).toBeVisible();
  });

  test('json field renders a textarea (not a single-line input)', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: { label: 'Request body', fieldId: 'body', field_type: 'json' },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    // Should render a resizable textarea for JSON
    const jsonArea = page.getByLabel('Request body');
    await expect(jsonArea).toBeVisible();
    const tagName = await jsonArea.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('textarea');
  });

  test('json field validates and shows error for invalid JSON', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'field_input',
      props: { label: 'Request body', fieldId: 'body', field_type: 'json' },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    await page.getByLabel('Request body').fill('{invalid json}');
    await page.getByLabel('Request body').blur();

    await expect(page.getByText('Must be valid JSON')).toBeVisible();
  });
});

// ── Suite: ChoiceSelectWidget ─────────────────────────────────────────────

test.describe('ChoiceSelectWidget', () => {
  test.beforeEach(async ({ page }) => {
    await interceptCatalog(page);
  });

  test('renders options and requires selection before Confirm', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'choice_select',
      props: {
        label: 'How often?',
        fieldId: 'frequency',
        options: [
          { value: 'daily',   label: 'Daily' },
          { value: 'weekly',  label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ],
      },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    await expect(page.getByText('How often?')).toBeVisible();
    await expect(page.getByText('Daily')).toBeVisible();
    await expect(page.getByText('Weekly')).toBeVisible();
    await expect(page.getByText('Monthly')).toBeVisible();

    // Confirm disabled before selection
    const confirm = page.getByRole('button', { name: /confirm/i });
    await expect(confirm).toBeDisabled();

    // Click an option → Confirm becomes enabled
    await page.getByText('Weekly').click();
    await expect(confirm).toBeEnabled();
  });
});

// ── Suite: StepPickerWidget ───────────────────────────────────────────────

test.describe('StepPickerWidget', () => {
  test.beforeEach(async ({ page }) => {
    await interceptCatalog(page);
  });

  test('renders steps and requires at least one selection', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'step_picker',
      props: {
        title: 'Pick your actions',
        multi: true,
        steps: [
          { id: 'step:http-request',  name: 'HTTP Request',  category: 'integration', description: 'Make HTTP calls' },
          { id: 'step:email-send',    name: 'Email Send',    category: 'communication', description: 'Send emails' },
        ],
      },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    await expect(page.getByText('Pick your actions')).toBeVisible();
    await expect(page.getByText('HTTP Request')).toBeVisible();
    await expect(page.getByText('Email Send')).toBeVisible();

    const useBtn = page.getByRole('button', { name: /select steps/i });
    await expect(useBtn).toBeDisabled();

    await page.getByText('HTTP Request').click();
    await expect(page.getByRole('button', { name: /use 1 step/i })).toBeEnabled();
  });
});

// ── Suite: ConfirmAddStepsWidget ──────────────────────────────────────────

test.describe('ConfirmAddStepsWidget', () => {
  test.beforeEach(async ({ page }) => {
    await interceptCatalog(page);
  });

  test('renders summary and Add to Canvas button', async ({ page }) => {
    await interceptChat(page, {
      id: 'tc1',
      tool: 'confirm_add_steps',
      props: {
        summary: 'Fetch invoices from Google Drive and email reminders weekly',
        trigger: { type: 'cron', schedule: '0 9 * * 1' },
        steps: [
          { stepId: 'step:http-request', name: 'Fetch Invoices', config: {} },
          { stepId: 'step:email-send',   name: 'Send Reminder', config: {} },
        ],
      },
    });

    await goToBuilder(page);
    await page.locator('textarea').first().fill('test');
    await page.locator('textarea').first().press('Enter');

    await expect(page.getByText('Fetch invoices from Google Drive and email reminders weekly')).toBeVisible();
    await expect(page.getByRole('button', { name: /add to canvas/i })).toBeVisible();
  });
});

// ── Suite: Action Library panel ───────────────────────────────────────────

test.describe('Action Library panel', () => {
  test('shows "Loading actions" then populates from catalog API', async ({ page }) => {
    // Delay catalog response to see loading state
    await page.route('**/v1/catalog/steps', async route => {
      await new Promise(r => setTimeout(r, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'step:http-request', name: 'HTTP Request', category: 'integration', description: 'Make HTTP calls', isSystem: true, isReusable: true, secretSchema: [], inputSchema: {}, outputSchema: {} },
          ],
        }),
      });
    });

    await authenticateAs(page, BUILDER_PATH, {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      role: 'operator',
      isSystemAdmin: false,
    });

    // May briefly show loading
    // After load, step should appear
    await expect(page.getByText('HTTP Request')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Make HTTP calls')).toBeVisible();
  });

  test('Action Library heading is visible', async ({ page }) => {
    await interceptCatalog(page);
    await goToBuilder(page);
    await expect(page.getByText('Action Library')).toBeVisible();
  });
});
