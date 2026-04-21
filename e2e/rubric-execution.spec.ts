/**
 * Execution Engine — 10-Dimension Rubric (Slice 6.x)
 *
 * Complement to rubric.spec.ts (App Builder UI). Grades the execution engine
 * from two angles:
 *   E1–E5  Backend assertions  — direct API calls, structured 0/5/10 scoring
 *   E6–E10 UI vision scoring   — same pattern as the App Builder rubric
 *
 * Backend dims are graded-only (no agent mutation). UI dims (E6–E10) can be
 * mutated by agents per execution-agents.json.
 *
 * See EXECUTION-HANDOFF.md for the orchestration loop.
 */

import { test, expect } from '@playwright/test';
import { authenticateAs } from './helpers/auth';
import { analyzeScreen, VISION_MODEL_DEEP } from './helpers/ai-vision';

// ── Config ────────────────────────────────────────────────────────────

const CONTROL_URL = process.env['CONTROL_PLANE_URL'] ?? 'https://localhost:7333';
const API_URL = process.env['LOOKOUT_API_URL'] ?? 'https://localhost:9444';
const SERVICE_SECRET = process.env['SERVICE_SHARED_SECRET'] ?? '';
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'test-secret';
const PLATFORM_SLUG = 'platform';

async function authAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await authenticateAs(page, '/platform', {
    jwtSecret: JWT_SECRET,
    isSystemAdmin: true,
    role: 'admin',
  });
}

// ── Score tracker ──────────────────────────────────────────────────────

const roundScores: Record<string, number | null> = {};

function recordScore(dim: string, score: number | null) {
  roundScores[dim] = score;
}

// ── Helpers: find platform tenant + admin apps ────────────────────────

async function findPlatformApps(
  page: import('@playwright/test').Page,
): Promise<{ tenantId: string; apps: Array<{ id: string; name: string }> }> {
  const tenants = await page.request
    .get(`${CONTROL_URL}/v1/tenants`)
    .then((r) => r.json())
    .then((j: { data: Array<{ id: string; slug: string }> }) => j.data);
  const platform = tenants.find((t) => t.slug === PLATFORM_SLUG);
  if (!platform) throw new Error('Platform tenant not seeded — run `pnpm seed:platform`');

  const apps = await page.request
    .get(`${CONTROL_URL}/v1/tenants/${platform.id}/apps`)
    .then((r) => r.json())
    .then((j: { data: Array<{ id: string; name: string }> }) => j.data);
  return { tenantId: platform.id, apps };
}

// ── Backend dims (E1–E5) ─────────────────────────────────────────────

test.describe('@backend Execution Engine backend dims', () => {
  test('@grade E1: execute route creates AppExecution with correct initial state', async ({ page }) => {
    await authAsAdmin(page);
    const { tenantId, apps } = await findPlatformApps(page);
    const syncApp = apps.find((a) => a.name === 'Sync n8n Catalog');
    if (!syncApp) {
      recordScore('E1', 0);
      expect(syncApp, 'Sync n8n Catalog app must exist').toBeTruthy();
      return;
    }

    const res = await page.request.post(
      `${API_URL}/v1/tenants/${tenantId}/apps/${syncApp.id}/execute`,
      {
        headers: { 'X-Service-Secret': SERVICE_SECRET },
        data: { input: {} },
      },
    );

    if (res.status() !== 202 && res.status() !== 200) {
      recordScore('E1', 0);
      expect(res.ok(), `execute returned ${res.status()}`).toBeTruthy();
      return;
    }
    const body = await res.json();
    const hasExecutionId = !!body?.data?.executionId;
    const hasStatus = typeof body?.data?.status === 'string';
    recordScore('E1', hasExecutionId && hasStatus ? 10 : 5);
    expect(hasExecutionId && hasStatus).toBeTruthy();
  });

  test('@grade E2: execution detail returns progress + cost fields', async ({ page }) => {
    await authAsAdmin(page);
    const { apps } = await findPlatformApps(page);
    const app = apps[0];
    if (!app) {
      recordScore('E2', 0);
      return;
    }
    const listRes = await page.request.get(
      `${CONTROL_URL}/v1/platform/apps/${app.id}/executions?limit=1`,
    );
    if (!listRes.ok()) {
      recordScore('E2', 0);
      return;
    }
    const list = (await listRes.json()).data as Array<{ id: string }>;
    if (list.length === 0) {
      // No executions yet — neutral score
      recordScore('E2', 5);
      return;
    }
    const detailRes = await page.request.get(
      `${CONTROL_URL}/v1/platform/apps/${app.id}/executions/${list[0]!.id}`,
    );
    const detail = (await detailRes.json()).data as Record<string, unknown>;
    const required = ['currentStepIndex', 'totalSteps', 'status'];
    const allPresent = required.every((k) => k in detail);
    recordScore('E2', allPresent ? 10 : 5);
    expect(allPresent).toBeTruthy();
  });

  test('@grade E3: lifecycle webhook dispatch stub (placeholder)', async () => {
    // TODO: Integration test harness — register a local HTTP collector, trigger
    // an execution, assert signed X-Lookout-Signature header + expected event types.
    // For Round 0 this is a placeholder that records a neutral score.
    recordScore('E3', 5);
    expect(true).toBeTruthy();
  });

  test('@grade E4: concurrency policy none rejects second trigger (placeholder)', async () => {
    // TODO: set platform app.concurrencyPolicy=none, trigger twice, assert 409.
    recordScore('E4', 5);
    expect(true).toBeTruthy();
  });

  test('@grade E5: cancel route marks execution cancelled (placeholder)', async () => {
    // TODO: trigger, cancel, poll for cancelled status + machine destroyed.
    recordScore('E5', 5);
    expect(true).toBeTruthy();
  });
});

// ── UI dims (E6–E10) ─────────────────────────────────────────────────

test.describe('Execution Engine UI dims', () => {
  test.beforeEach(async ({ page }) => {
    await authAsAdmin(page);
    await page.goto('/platform');
    const jobsBtn = page.locator('button:has-text("Jobs")');
    if (await jobsBtn.isVisible()) await jobsBtn.click();
    await page.waitForTimeout(500);
  });

  test('E6: Jobs tab renders execution list with status badges', async ({ page }) => {
    const { answer } = await analyzeScreen(
      page,
      "Score 1-10 on execution list rendering. Look for app cards, execution rows with status badges (queued/running/completed/failed), timestamps. Respond with the numeric score in the answer field.",
      VISION_MODEL_DEEP,
    );
    const match = String(answer).match(/(\d+)/);
    recordScore('E6', match ? parseInt(match[1]!, 10) : null);
  });

  test('E7: Progress bar for running executions', async ({ page }) => {
    const { answer } = await analyzeScreen(
      page,
      "Score 1-10 on progress visualization. Look for 'Step N of M — {stepName}' text and a filled progress bar for running executions.",
      VISION_MODEL_DEEP,
    );
    const match = String(answer).match(/(\d+)/);
    recordScore('E7', match ? parseInt(match[1]!, 10) : null);
  });

  test('E8: Concurrency warning affordance', async ({ page }) => {
    const { answer } = await analyzeScreen(
      page,
      "Score 1-10 on concurrency warning affordances (disabled Run button when a job is already active, or a confirmation dialog explaining the concurrency policy).",
      VISION_MODEL_DEEP,
    );
    const match = String(answer).match(/(\d+)/);
    recordScore('E8', match ? parseInt(match[1]!, 10) : null);
  });

  test('E9: Execution detail drawer — step timeline + output', async ({ page }) => {
    const firstRow = page.locator('li').filter({ hasText: /queued|running|completed|failed/ }).first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(500);
    }
    const { answer } = await analyzeScreen(
      page,
      "Score 1-10 on execution detail drawer content: ID, status, timestamps, machine info, step log/output, error details.",
      VISION_MODEL_DEEP,
    );
    const match = String(answer).match(/(\d+)/);
    recordScore('E9', match ? parseInt(match[1]!, 10) : null);
  });

  test('E10: Platform admin Jobs tab overall', async ({ page }) => {
    const { answer } = await analyzeScreen(
      page,
      "Score 1-10 on the overall Platform Admin Jobs tab. Platform tenant admin apps (Sync n8n Catalog, Reindex Embeddings) should be listed with Run buttons, execution history, and clear status.",
      VISION_MODEL_DEEP,
    );
    const match = String(answer).match(/(\d+)/);
    recordScore('E10', match ? parseInt(match[1]!, 10) : null);
  });
});

// ── Composite ─────────────────────────────────────────────────────────

test('@grade Execution rubric composite', async () => {
  const values = Object.values(roundScores).filter((v): v is number => typeof v === 'number');
  const composite = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  // eslint-disable-next-line no-console
  console.log('Execution rubric scores:', { ...roundScores, composite });
  expect(values.length, 'at least one dim scored').toBeGreaterThan(0);
});
