/**
 * Workflow Builder — 10-Dimension Maturity Rubric
 *
 * Rubric (each dimension scored 1–10 by the AI vision model):
 *
 *  D1  Visual Canvas        — Node-based flow vs linear list. Competitor: n8n, Zapier
 *  D2  Data Mapping         — Visual output→input wiring. Competitor: Make.com, n8n
 *  D3  Step Configuration   — Richness of per-type forms. Competitor: Postman Flows
 *  D4  Trigger UX           — Webhook URL, cron builder, API docs. Competitor: Zapier
 *  D5  Validation & Debug   — Inline errors, test-run, execution logs. Competitor: n8n
 *  D6  Onboarding / Empty   — Guidance, templates, AI assist. Competitor: Make.com
 *  D7  Visual Polish        — Typography, spacing, icons, motion. Competitor: Linear
 *  D8  Responsiveness       — Tablet + keyboard accessibility. Competitor: Notion
 *  D9  Auth & Secrets UX    — Secrets management clarity. Competitor: Vercel
 *  D10 Saving & Versioning  — Autosave, undo, version history. Competitor: Figma
 *
 * Each test asks the AI to score one dimension and log suggestions.
 * The final test aggregates all dimension scores into a composite grade.
 */

import { test, expect } from '@playwright/test';
import { authenticateAs } from './helpers/auth';
import { analyzeScreen, VISION_MODEL_DEEP } from './helpers/ai-vision';
import * as fs from 'fs';
import * as path from 'path';

// ── Score tracker (shared across tests via global) ─────────────────────
const roundScores: Record<string, number | null> = {};

function recordScore(dim: string, answer: string) {
  const match = String(answer).match(/(\d+)/);
  roundScores[dim] = match ? parseInt(match[1], 10) : null;
}

function appendToHistory(notes: string = '') {
  const histPath = path.join(__dirname, 'rubric-history.json');
  const history = JSON.parse(fs.readFileSync(histPath, 'utf8'));
  const lastRound = history.runs[history.runs.length - 1]?.round ?? 0;
  history.runs.push({
    round: lastRound + 1,
    date: new Date().toISOString().slice(0, 10),
    scores: {
      D1: roundScores['D1'] ?? null,
      D2: roundScores['D2'] ?? null,
      D3: roundScores['D3'] ?? null,
      D4: roundScores['D4'] ?? null,
      D5: roundScores['D5'] ?? null,
      D6: roundScores['D6'] ?? null,
      D7: roundScores['D7'] ?? null,
      D8: roundScores['D8'] ?? null,
      D9: roundScores['D9'] ?? null,
      D10: roundScores['D10'] ?? null,
      composite: null,
    },
    notes,
  });
  fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
  return history.runs[history.runs.length - 1];
}

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID = process.env.E2E_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const NEW_BUILDER_PATH = `/tenants/${TENANT_ID}/apps/new`;

// ── Shared setup: build a 3-step workflow ─────────────────────────────

async function buildDemoWorkflow(page: Parameters<typeof authenticateAs>[0]) {
  await authenticateAs(page, NEW_BUILDER_PATH, {
    jwtSecret: JWT_SECRET,
    tenantId: TENANT_ID,
    isSystemAdmin: true,
  });
  await page.waitForTimeout(1500);
  await page.getByPlaceholder('My Workflow').fill('Customer Inquiry Handler');
  await page.getByPlaceholder('Describe what this workflow does').fill(
    'Receives a customer inquiry via webhook, classifies it with AI, then routes to email or SMS.'
  );
  // Add steps (click catalog items - use items visible without scroll)
  await page.getByText('HTTP Request').first().click();
  await page.waitForTimeout(300);
  await page.getByText('OpenAI').first().click();
  await page.waitForTimeout(300);
  await page.getByText('Date & Time').first().click();
  await page.waitForTimeout(500);
}

// ── D1: Visual Canvas ─────────────────────────────────────────────────

test('D1 — Visual Canvas: node-based flow vs linear list', async ({ page }) => {
  await buildDemoWorkflow(page);

  const result = await analyzeScreen(
    page,
    'Score this workflow canvas from 1-10 for VISUAL CANVAS quality, compared to n8n and Zapier. ' +
    'Specifically: (a) Are steps rendered as connected nodes on a canvas with edges/arrows between them? ' +
    '(b) Is there a minimap? Controls (zoom/fit)? ' +
    '(c) Can you visually see the flow from trigger → step 1 → step 2 → step 3? ' +
    '(d) Does it feel like a production workflow builder or a list UI? ' +
    'Return score as a number 1-10 in "answer", detailed observations in "reasoning", and competitor-parity improvements in "suggestions".',
    VISION_MODEL_DEEP
  );

  recordScore('D1', result.answer);
  console.log('\n\n📊 D1 — VISUAL CANVAS');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D2: Data Mapping ──────────────────────────────────────────────────

test('D2 — Data Mapping: visual output→input field wiring', async ({ page }) => {
  await buildDemoWorkflow(page);
  await page.waitForTimeout(800);

  // Click the AI Processing node on the canvas to open its config panel
  const aiNode = page.locator('.react-flow__node').filter({ hasText: 'AI Processing' }).first();
  if (await aiNode.count() > 0) {
    await aiNode.click();
    await page.waitForTimeout(600);
    // Switch to the Map Data tab if present
    const mapDataTab = page.getByRole('button', { name: /map data/i });
    if (await mapDataTab.count() > 0) {
      await mapDataTab.click();
      await page.waitForTimeout(400);
    }
  }

  const result = await analyzeScreen(
    page,
    'Score 1-10 for DATA MAPPING UX, compared to Make.com and n8n. ' +
    'Specifically: (a) When configuring a step, can the user see available output fields from upstream steps? ' +
    '(b) Is there a visual way to map/wire data from a previous step output into the current step input? ' +
    '(c) Can the user use syntax like {{stepId.field}} or drag-and-drop field references? ' +
    '(d) Is it clear how to pass data from one step to the next? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D2', result.answer);
  console.log('\n\n📊 D2 — DATA MAPPING');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D3: Step Configuration ────────────────────────────────────────────

test('D3 — Step Configuration: richness of per-type forms', async ({ page }) => {
  await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
  await page.waitForTimeout(1000);

  // Add via catalog click, then open node config
  await page.getByText('HTTP Request').first().click();
  await page.waitForTimeout(600);

  // Click the node on the canvas
  const node = page.locator('.react-flow__node').filter({ hasText: 'HTTP Request' }).first();
  if (await node.count() > 0) {
    await node.click();
  } else {
    await page.getByText('HTTP Request', { exact: false }).nth(1).click();
  }
  await page.waitForTimeout(800);

  // Set method to POST so Body field renders
  const methodSelect = page.locator('select').filter({ hasText: /GET|POST/ }).first();
  if (await methodSelect.count() > 0) {
    await methodSelect.selectOption('POST');
    await page.waitForTimeout(300);
  }

  // Scroll the config panel content to show Auth + Body
  await page.evaluate(() => {
    const panels = document.querySelectorAll('[style*="max-height"]');
    panels.forEach(p => { (p as HTMLElement).scrollTop = 300; });
  });
  await page.waitForTimeout(300);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for STEP CONFIGURATION richness, compared to Postman Flows and n8n. ' +
    'Is the HTTP Request form visible with: Method dropdown, URL field, Headers KV editor, ' +
    'Auth type selector (Bearer/OAuth/Basic/API Key), Body textarea, Response handling? ' +
    'Are tooltips or hints present explaining {{SECRET_NAME}} syntax? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D3', result.answer);
  console.log('\n\n📊 D3 — STEP CONFIGURATION');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D4: Trigger UX ───────────────────────────────────────────────────

test('D4 — Trigger UX: webhook URL, cron, API docs', async ({ page }) => {
  await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
  await page.waitForTimeout(1500);

  // Add a step so the trigger node is visible with edges
  await page.getByText('HTTP Request').first().click();
  await page.waitForTimeout(600);

  // Scroll to top to ensure canvas + settings visible
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for TRIGGER UX, compared to Zapier and n8n. ' +
    'Is there a trigger node visible on the canvas? ' +
    'For webhook trigger: is a copyable URL shown or a "save to reveal" prompt? ' +
    'Are all trigger types (webhook, cron, API, manual) selectable? ' +
    'For cron: is there a human-readable preview (e.g. "Every 5 minutes")? ' +
    'Is the trigger node visually distinct from step nodes? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D4', result.answer);
  console.log('\n\n📊 D4 — TRIGGER UX');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D5: Validation & Debugging ────────────────────────────────────────

test('D5 — Validation & Debug: inline errors, test-run, logs', async ({ page }) => {
  await buildDemoWorkflow(page);
  await page.getByPlaceholder('My Workflow').fill('Test Workflow');
  await page.waitForTimeout(300);

  // Trigger validate
  const validateBtn = page.getByRole('button', { name: /validate/i });
  if (await validateBtn.isEnabled()) await validateBtn.click();
  await page.waitForTimeout(1500);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for VALIDATION & DEBUGGING UX, compared to n8n and Postman. ' +
    'After clicking Validate: is there a clear pass/fail indicator? ' +
    'Are per-step validation errors shown inline on the node? ' +
    'Is there an execution log visible or accessible? ' +
    'Can the user test-run a single step in isolation? ' +
    'Are step output previews available after a test run? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D5', result.answer);
  console.log('\n\n📊 D5 — VALIDATION & DEBUG');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D6: Onboarding / Empty State ──────────────────────────────────────

test('D6 — Onboarding: guidance, templates, AI assist', async ({ page }) => {
  await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
  await page.waitForTimeout(1000);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for ONBOARDING & EMPTY STATE UX, compared to Make.com and Zapier. ' +
    'With a blank new workflow: is there a helpful empty state in the canvas? ' +
    'Are starter templates offered? ' +
    'Is the AI Assist button prominent with a clear CTA? ' +
    'Is there a guided tour or tooltip walkthrough available? ' +
    'Is the purpose of each panel (Settings / Canvas / Catalog) immediately obvious? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D6', result.answer);
  console.log('\n\n📊 D6 — ONBOARDING / EMPTY STATE');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D7: Visual Polish ─────────────────────────────────────────────────

test('D7 — Visual Polish: typography, spacing, icons, motion', async ({ page }) => {
  await buildDemoWorkflow(page);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for VISUAL POLISH, compared to Linear and Vercel\'s dashboard. ' +
    'Evaluate: typography consistency, whitespace and spacing quality, icon usage, ' +
    'color palette coherence, node/card design quality, button styling consistency, ' +
    'overall "does this look like a $50/mo SaaS product or a side project?" ' +
    'Return score 1-10 in "answer". Be harsh and specific.',
    VISION_MODEL_DEEP
  );

  recordScore('D7', result.answer);
  console.log('\n\n📊 D7 — VISUAL POLISH');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D8: Responsiveness & Accessibility ───────────────────────────────

test('D8 — Responsiveness: tablet layout and keyboard nav', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await buildDemoWorkflow(page);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for RESPONSIVENESS & ACCESSIBILITY at 900px viewport, compared to Notion. ' +
    'Are all three panels (Settings, Canvas, Catalog) visible and usable? ' +
    'Is text readable? Are buttons/controls the right size for touch? ' +
    'Is anything clipped, overflowing, or broken? ' +
    'Are focus states visible for keyboard navigation? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D8', result.answer);
  console.log('\n\n📊 D8 — RESPONSIVENESS & ACCESSIBILITY');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D9: Auth & Secrets UX ────────────────────────────────────────────

test('D9 — Auth & Secrets: clarity of secrets management', async ({ page }) => {
  await buildDemoWorkflow(page);
  await page.waitForTimeout(800);

  // Fill workflow name so secrets panel is relevant
  await page.getByPlaceholder('My Workflow').fill('Secrets Test Workflow');
  await page.waitForTimeout(300);

  // Attempt save (non-blocking — just try, don't timeout waiting for result)
  try {
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    if (await saveBtn.isEnabled({ timeout: 2000 })) {
      await saveBtn.click({ timeout: 2000 });
      await page.waitForTimeout(2000);
    }
  } catch { /* best-effort */ }

  const result = await analyzeScreen(
    page,
    'Score 1-10 for SECRETS & AUTH MANAGEMENT UX, compared to Vercel environment variables and Railway. ' +
    'Is there a secrets panel visible after saving? ' +
    'Does it clearly show which secrets are required vs. configured? ' +
    'Is there guidance on what each secret is for? ' +
    'Can the user set secrets inline without leaving the builder? ' +
    'Is it clear how to use {{SECRET_NAME}} syntax in step config? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D9', result.answer);
  console.log('\n\n📊 D9 — AUTH & SECRETS');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── D10: Saving & Versioning ──────────────────────────────────────────

test('D10 — Saving & Versioning: autosave, undo, history', async ({ page }) => {
  await buildDemoWorkflow(page);
  await page.getByPlaceholder('My Workflow').fill('Version Test Workflow');
  await page.waitForTimeout(400);

  // Save so the app gets an ID and autosave becomes active
  try {
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    if (await saveBtn.isEnabled({ timeout: 2000 })) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }
  } catch { /* best-effort */ }

  // Make another change to trigger the autosave path
  await page.getByPlaceholder('Describe what this workflow does').fill('Updated description for autosave test');
  await page.waitForTimeout(600);

  const result = await analyzeScreen(
    page,
    'Score 1-10 for SAVING & VERSIONING UX, compared to Figma and Notion. ' +
    'Is there an autosave indicator? ' +
    'Is there an undo/redo button or keyboard shortcut (Cmd+Z)? ' +
    'Is there a version history or changelog visible? ' +
    'Is the Save button state (disabled/enabled/saving/saved) clearly communicated? ' +
    'After saving, is there a clear success state? ' +
    'Return score 1-10 in "answer".',
    VISION_MODEL_DEEP
  );

  recordScore('D10', result.answer);
  console.log('\n\n📊 D10 — SAVING & VERSIONING');
  console.log(`   Score: ${result.answer}/10`);
  console.log(`   Assessment: ${result.reasoning}`);
  if (result.suggestions.length) {
    console.log('   To improve:');
    result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  }

  expect(result.answer).toBeDefined();
});

// ── Composite Score ───────────────────────────────────────────────────

test('COMPOSITE — Overall maturity grade and roadmap to 10', async ({ page }) => {
  await buildDemoWorkflow(page);
  await page.waitForTimeout(500);

  const result = await analyzeScreen(
    page,
    'You are a senior product manager at a Series B SaaS company. ' +
    'Grade this workflow builder on each of these 10 dimensions (1-10): ' +
    'Visual Canvas, Data Mapping, Step Configuration, Trigger UX, Validation & Debug, ' +
    'Onboarding, Visual Polish, Responsiveness, Secrets UX, Saving & Versioning. ' +
    'Then give an overall composite score. ' +
    'Finally, list the TOP 5 highest-ROI improvements — the ones that would move the needle most ' +
    'toward achieving parity with n8n, Zapier, and Make.com. ' +
    'Be brutally honest. This team wants to build a world-class product. ' +
    'Return all scores and the top 5 improvements.',
    VISION_MODEL_DEEP
  );

  console.log('\n\n🏆 COMPOSITE MATURITY SCORE — ROADMAP TO 10');
  console.log('==============================================');
  console.log(result.answer);
  console.log('\nDetailed Assessment:');
  console.log(result.reasoning);
  if (result.suggestions.length) {
    console.log('\n🎯 Highest-ROI Improvements:');
    result.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
  if (result.issues.length) {
    console.log('\n⚠️ Critical Issues:');
    result.issues.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }

  // Persist this run to rubric-history.json
  const savedRun = appendToHistory('auto-logged from rubric run');
  const scores = savedRun.scores;
  const validScores = Object.values(scores).filter((v): v is number => typeof v === 'number');
  const avg = validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : 'N/A';

  console.log('\n📈 SCORE HISTORY UPDATED → e2e/rubric-history.json');
  console.log(`   Round ${savedRun.round} | ${savedRun.date}`);
  console.log(`   D1:${scores.D1} D2:${scores.D2} D3:${scores.D3} D4:${scores.D4} D5:${scores.D5}`);
  console.log(`   D6:${scores.D6} D7:${scores.D7} D8:${scores.D8} D9:${scores.D9} D10:${scores.D10}`);
  console.log(`   Average: ${avg}/10`);

  // Always passes — output is the value
  expect(result).toBeDefined();
});
