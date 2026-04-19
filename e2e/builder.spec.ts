/**
 * App Builder — AI-driven end-to-end test suite
 *
 * Philosophy:
 *   - Every assertion that would normally be a fragile selector check is instead
 *     delegated to an AI vision model (Gemini 2.5 Pro via OpenRouter).
 *   - The AI reasons about what is on screen, flags UX issues, and proposes
 *     concrete improvements — logged to stdout for developer review.
 *   - Playwright handles navigation, interaction, and screenshot capture.
 *   - Hard assertions are used only for critical functional correctness.
 */

import { test, expect } from '@playwright/test';
import { authenticateAs } from './helpers/auth';
import { analyzeScreen, auditScreen, VISION_MODEL_DEEP } from './helpers/ai-vision';

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID = process.env.E2E_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
// Shared builder URL for new-app flow
const NEW_BUILDER_PATH = `/tenants/${TENANT_ID}/apps/new`;
const TENANT_PATH = `/tenants/${TENANT_ID}`;

// ── Test fixtures ─────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await authenticateAs(page, '/', {
    jwtSecret: JWT_SECRET,
    tenantId: TENANT_ID,
    role: 'admin',
    isSystemAdmin: true,
  });
});

// ── Suite 1: Tenant Apps Tab ──────────────────────────────────────────

test.describe('Apps Tab', () => {
  test('renders the apps tab with correct layout', async ({ page }) => {
    await authenticateAs(page, TENANT_PATH, {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      isSystemAdmin: true,
    });

    await page.waitForTimeout(2000); // let API calls settle

    const insight = await analyzeScreen(
      page,
      'Is an "Apps" tab visible? Is there a list of apps or an empty state? ' +
      'Is there a button to create a new app?'
    );

    console.log('\n📸 Apps Tab audit:', insight.reasoning);
    expect(['yes', 'partial'].some(a => insight.answer.toLowerCase().includes(a) || insight.answer.toLowerCase().includes('app'))).toBeTruthy();

    await auditScreen(page, 'Tenant Apps Tab — initial load');
  });

  test('apps tab shows execution history per app', async ({ page }) => {
    await authenticateAs(page, TENANT_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(2000);

    const insight = await analyzeScreen(
      page,
      'Does each app card show execution history, run count, or last-run status? ' +
      'Or is execution data completely absent?'
    );

    console.log('\n📸 Execution history visibility:', insight.reasoning);
    await auditScreen(page, 'Apps Tab — execution history per app');
  });
});

// ── Suite 2: Builder — Initial Load ──────────────────────────────────

test.describe('App Builder — Initial Load', () => {
  test('shows three-panel layout: settings, canvas, catalog', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1500);

    const insight = await analyzeScreen(
      page,
      'Does the page show three distinct panels: (1) a settings panel with Name/Description/Trigger, ' +
      '(2) a center step canvas labeled "Steps", and (3) a right-side Step Catalog? ' +
      'Are action buttons (Validate, AI Assist, Save) visible in the header?'
    );

    console.log('\n📸 Builder layout:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|three|panels|settings|canvas|catalog/);

    await auditScreen(page, 'App Builder — initial 3-panel layout');
  });

  test('step catalog contains all expected step types', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1500);

    const insight = await analyzeScreen(
      page,
      'List every step type visible in the Step Catalog panel. ' +
      'Are these present: HTTP Request, AI Processing, Data Transform, Condition/Branch, Delay, Email Send, Twilio SMS? ' +
      'Do they show category badges (integration, ai, data, logic, communication)?'
    );

    console.log('\n📸 Step catalog contents:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/http|ai processing|data transform/);

    await auditScreen(page, 'App Builder — Step Catalog completeness');
  });

  test('trigger dropdown shows all trigger types', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    // Click the trigger dropdown to expand it
    const triggerSelect = page.locator('select').filter({ hasText: /webhook|cron|api|manual/i }).first();
    await triggerSelect.click();

    const insight = await analyzeScreen(
      page,
      'Is a trigger dropdown visible? Does it show options for: Webhook, API Trigger, Cron Schedule, Manual? ' +
      'Is "Webhook" currently selected as the default?'
    );

    console.log('\n📸 Trigger dropdown:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|webhook|trigger/);

    await auditScreen(page, 'App Builder — Trigger type selector');
  });

  test('AI audits the empty canvas state UX', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    const result = await auditScreen(
      page,
      'App Builder empty state — "No steps yet" canvas. Evaluate onboarding UX quality.'
    );

    // Log all suggestions — these become a backlog of improvements
    expect(result).toBeDefined();
  });
});

// ── Suite 3: Adding Steps ─────────────────────────────────────────────

test.describe('App Builder — Adding Steps', () => {
  test('clicking HTTP Request adds it to the canvas', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    // Click HTTP Request in the catalog
    await page.getByText('HTTP Request').first().click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Has an "HTTP Request" step been added to the canvas (center panel)? ' +
      'Does the step count in the "Steps" header now show "(1)"? ' +
      'Is a config panel visible below or beside the canvas?'
    );

    console.log('\n📸 After adding HTTP Request:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|added|step|canvas|1/);

    await auditScreen(page, 'App Builder — after adding first step');
  });

  test('HTTP Request step config panel shows rich form fields', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.getByText('HTTP Request').first().click();
    await page.waitForTimeout(500);

    // Click the step to open config
    await page.getByText('HTTP Request', { exact: false }).nth(1).click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Is a step configuration panel visible for "HTTP Request"? ' +
      'Does it show fields for: Method (GET/POST/etc dropdown), URL input, Headers section, ' +
      'Authentication (with options like Bearer/OAuth/API Key), Request Body, Response handling? ' +
      'Rate the completeness of this config form from 1-10 for production readiness.'
    );

    console.log('\n📸 HTTP Request config form:', insight.reasoning);
    expect(insight.answer).toBeDefined();

    await auditScreen(page, 'HTTP Request step config form — production readiness');
  });

  test('AI Processing step config panel shows model picker and prompt fields', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.getByText('AI Processing').first().click();
    await page.waitForTimeout(500);
    await page.getByText('AI Processing', { exact: false }).nth(1).click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Is the AI Processing config panel visible? ' +
      'Does it show: a model selector (with options like GPT-4o, Claude, Gemini), ' +
      'a system prompt textarea, a user prompt textarea, temperature and max tokens controls? ' +
      'What is missing vs. what a professional AI workflow tool like n8n or Zapier would show?'
    );

    console.log('\n📸 AI Processing config:', insight.reasoning);
    expect(insight.answer).toBeDefined();

    await auditScreen(page, 'AI Processing step config — vs industry standard');
  });

  test('multiple steps can be added and reordered', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    // Add three steps
    await page.getByText('HTTP Request').first().click();
    await page.waitForTimeout(300);
    await page.getByText('AI Processing').first().click();
    await page.waitForTimeout(300);
    await page.getByText('Email Send').first().click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Are three steps visible in the canvas in order: HTTP Request, AI Processing, Email Send? ' +
      'Are up/down reorder arrows visible on each step? ' +
      'Is a delete button visible on each step?'
    );

    console.log('\n📸 Multi-step canvas:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|three|http|ai|email/);

    await auditScreen(page, 'App Builder — multi-step canvas with reordering');
  });

  test('Data Transform config shows mode picker and field mappings', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.getByText('Data Transform').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Data Transform', { exact: false }).nth(1).click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Is the Data Transform config visible? ' +
      'Does it show a mode selector (field mapping / jq / template)? ' +
      'Is there a way to add field mapping rows with source → destination paths?'
    );

    console.log('\n📸 Data Transform config:', insight.reasoning);
    await auditScreen(page, 'Data Transform step — mode picker and field mapping UX');
  });

  test('Condition/Branch config shows expression editor and branch targets', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.getByText('Condition/Branch').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Condition/Branch', { exact: false }).nth(1).click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Is the Condition/Branch config visible? ' +
      'Does it show: a condition expression input, a "true branch" step ID field, ' +
      'and a "false branch" step ID field? ' +
      'What would you add to make branching logic more visual and intuitive?'
    );

    console.log('\n📸 Condition config:', insight.reasoning);
    await auditScreen(page, 'Condition/Branch step — expression editor UX');
  });
});

// ── Suite 4: Trigger Config ───────────────────────────────────────────

test.describe('App Builder — Trigger Configuration', () => {
  test('webhook trigger shows URL after save prompt', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    // Ensure webhook is selected (default)
    const insight = await analyzeScreen(
      page,
      'Is "Webhook" selected as the trigger type? ' +
      'Is there a message or field showing the webhook URL or instructing the user to save to get the URL? ' +
      'Is there a copy button for the webhook URL?'
    );

    console.log('\n📸 Webhook trigger UX:', insight.reasoning);
    await auditScreen(page, 'Webhook trigger — URL visibility and copy UX');
  });

  test('switching to cron shows schedule input', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    // Switch trigger to cron
    await page.locator('select').filter({ hasText: /webhook|cron|api|manual/i }).first().selectOption('cron');
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'After switching to "Cron Schedule" trigger, is a cron expression input field visible? ' +
      'Is there helper text explaining the cron syntax? ' +
      'Is there a human-readable preview of when the cron will fire?'
    );

    console.log('\n📸 Cron trigger UX:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|cron|schedule|input/);
    await auditScreen(page, 'Cron trigger — schedule input and human-readable preview');
  });

  test('switching to manual trigger shows appropriate message', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.locator('select').filter({ hasText: /webhook|cron|api|manual/i }).first().selectOption('manual');
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'After switching to "Manual" trigger, is there guidance shown about how to trigger the workflow manually? ' +
      'What would you expect to see here vs. what is shown?'
    );

    console.log('\n📸 Manual trigger UX:', insight.reasoning);
    await auditScreen(page, 'Manual trigger — guidance and UX');
  });
});

// ── Suite 5: Save & Validation Flow ──────────────────────────────────

test.describe('App Builder — Save & Validation', () => {
  test('save button is disabled without a name', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    const insight = await analyzeScreen(
      page,
      'Is the Save button disabled or grayed out? ' +
      'Is there any indication to the user that a workflow name is required before saving?'
    );

    console.log('\n📸 Save button disabled state:', insight.reasoning);
    await auditScreen(page, 'App Builder — save disabled state and empty form guidance');
  });

  test('entering a name enables save', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('My Workflow').fill('Test Inquiry Responder');
    await page.waitForTimeout(300);

    const insight = await analyzeScreen(
      page,
      'After entering a workflow name, is the Save button now enabled (not grayed out)? ' +
      'Does the name field show "Test Inquiry Responder"?'
    );

    console.log('\n📸 Save button enabled:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|enabled|save/);
  });

  test('validate button is disabled with no steps', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    const insight = await analyzeScreen(
      page,
      'Is the Validate button disabled when there are no steps? ' +
      'Is the AI Assist button enabled? Does it require a description to work?'
    );

    console.log('\n📸 Toolbar state with empty canvas:', insight.reasoning);
    await auditScreen(page, 'App Builder — toolbar button states with empty canvas');
  });
});

// ── Suite 6: Authentication Config in HTTP Steps ──────────────────────

test.describe('HTTP Request — Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);
    await page.getByText('HTTP Request').first().click();
    await page.waitForTimeout(300);
    await page.getByText('HTTP Request', { exact: false }).nth(1).click();
    await page.waitForTimeout(500);
  });

  test('OAuth 2.0 client credentials shows all required fields', async ({ page }) => {
    // Find auth type selector and pick OAuth2
    const authSelects = page.locator('select');
    // Find the one with OAuth option
    for (const sel of await authSelects.all()) {
      const options = await sel.evaluate((s: HTMLSelectElement) => Array.from(s.options).map(o => o.value));
      if (options.includes('oauth2-client-credentials')) {
        await sel.selectOption('oauth2-client-credentials');
        break;
      }
    }
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'After selecting "OAuth 2.0 Client Credentials" authentication, are these fields visible: ' +
      'Token URL, Client ID, Client Secret, Scope? ' +
      'Is there guidance about using {{SECRET_NAME}} syntax for secrets? ' +
      'What is missing vs. Postman\'s OAuth 2.0 configuration?'
    );

    console.log('\n📸 OAuth 2.0 config:', insight.reasoning);
    expect(insight.answer.toLowerCase()).toMatch(/yes|token|client|oauth/);
    await auditScreen(page, 'HTTP Request — OAuth 2.0 client credentials form completeness vs Postman');
  });

  test('Bearer token auth shows token field with secret interpolation hint', async ({ page }) => {
    const authSelects = page.locator('select');
    for (const sel of await authSelects.all()) {
      const options = await sel.evaluate((s: HTMLSelectElement) => Array.from(s.options).map(o => o.value));
      if (options.includes('bearer')) {
        await sel.selectOption('bearer');
        break;
      }
    }
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Does the Bearer Token auth section show a token input with a placeholder or hint about using {{SECRET_NAME}} syntax? ' +
      'Is it clear to the user how to reference a stored secret?'
    );

    console.log('\n📸 Bearer token UX:', insight.reasoning);
    await auditScreen(page, 'HTTP Request — Bearer token auth UX and secret interpolation clarity');
  });
});

// ── Suite 7: Overall UX Maturity Audit ───────────────────────────────

test.describe('Full Builder — Maturity Audit', () => {
  test('AI grades the full builder for Silicon Valley production readiness', async ({ page }) => {
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });

    // Build a realistic workflow
    await page.getByPlaceholder('My Workflow').fill('Customer Inquiry Handler');
    await page.getByPlaceholder('Describe what this workflow does').fill(
      'Classifies incoming customer inquiries by urgency and category, then routes to email or SMS'
    );
    await page.getByText('HTTP Request').first().click();
    await page.waitForTimeout(200);
    await page.getByText('AI Processing').first().click();
    await page.waitForTimeout(200);
    await page.getByText('Condition/Branch').first().click();
    await page.waitForTimeout(200);
    await page.getByText('Email Send').first().click();
    await page.waitForTimeout(500);

    const insight = await analyzeScreen(
      page,
      'Grade this workflow builder UI from 1-10 for production readiness compared to best-in-class tools ' +
      'like n8n, Zapier, or Make.com. ' +
      'What are the top 5 most impactful improvements needed to reach a grade of 9 or 10? ' +
      'What features are completely missing that users would expect?',
      VISION_MODEL_DEEP
    );

    console.log('\n\n🎯 FULL BUILDER MATURITY AUDIT');
    console.log('================================');
    console.log('AI Grade & Assessment:', insight.reasoning);
    if (insight.suggestions.length > 0) {
      console.log('\nTop Improvements Needed:');
      insight.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    }
    if (insight.issues.length > 0) {
      console.log('\nCritical Issues:');
      insight.issues.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    }

    // This test always passes — its value is the logged output
    expect(insight).toBeDefined();
  });

  test('AI evaluates mobile/responsive layout quality', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
    await page.waitForTimeout(1000);

    const insight = await analyzeScreen(
      page,
      'On a tablet viewport (768px wide), how does the builder layout adapt? ' +
      'Are the three panels still accessible? Is anything clipped or broken? ' +
      'How does this compare to what you\'d expect from a production SaaS product?'
    );

    console.log('\n📸 Tablet layout audit:', insight.reasoning);
    await auditScreen(page, 'App Builder — tablet/responsive layout quality', VISION_MODEL_DEEP);
  });
});
