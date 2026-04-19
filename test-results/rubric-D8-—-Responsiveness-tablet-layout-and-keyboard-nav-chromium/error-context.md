# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rubric.spec.ts >> D8 — Responsiveness: tablet layout and keyboard nav
- Location: e2e/rubric.spec.ts:345:5

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByText('HTTP Request').first()
    - locator resolved to <div class="text-sm font-medium text-gray-800 truncate">HTTP Request</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 p-6">…</div> from <div class="lg:col-span-5 flex flex-col gap-3 min-h-0">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 p-6">…</div> from <div class="lg:col-span-5 flex flex-col gap-3 min-h-0">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    168 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div class="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 p-6">…</div> from <div class="lg:col-span-5 flex flex-col gap-3 min-h-0">…</div> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "App Builder" [level=1] [ref=e6]
    - generic [ref=e7]:
      - button "Undo (Ctrl+Z)" [disabled]:
        - img
        - generic: ⌘Z
      - button "Validate workflow" [ref=e8] [cursor=pointer]:
        - img [ref=e9]
      - button "Help" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
      - button "Save workflow (Ctrl+S)" [ref=e16] [cursor=pointer]:
        - img [ref=e17]
        - text: Save
  - toolbar "Keyboard shortcuts" [ref=e21]:
    - generic [ref=e22]: ⌘S save
    - generic [ref=e23]: ⌘Z undo
    - generic [ref=e24]: Del remove
  - generic [ref=e26]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - heading "Workflow Settings" [level=3] [ref=e30]
        - generic [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]: Name
            - textbox "My Workflow" [ref=e34]: Customer Inquiry Handler
          - generic [ref=e35]:
            - generic [ref=e36]: Description
            - textbox "Describe what this workflow does" [active] [ref=e37]: Receives a customer inquiry via webhook, classifies it with AI, then routes to email or SMS.
          - generic [ref=e38]:
            - generic [ref=e39]: Trigger
            - combobox [ref=e40]:
              - option "🔗 Webhook" [selected]
              - option "🌐 API Trigger"
              - option "⏰ Cron Schedule"
              - option "▶️ Manual"
          - generic [ref=e41]:
            - generic [ref=e42]: Webhook URL
            - generic [ref=e43]:
              - img [ref=e44]
              - code [ref=e47]: "/webhooks/{id} — save to activate"
      - generic [ref=e48]:
        - heading "Secrets Encrypted at rest" [level=3] [ref=e50]:
          - img [ref=e51]
          - text: Secrets
          - generic [ref=e54]:
            - img [ref=e55]
            - text: Encrypted at rest
        - generic [ref=e58]:
          - generic [ref=e59]:
            - textbox "Secret key name" [ref=e60]:
              - /placeholder: SECRET_KEY
            - textbox "Secret value" [ref=e61]:
              - /placeholder: secret value
            - button "Add Secret" [disabled]:
              - img
              - text: Add Secret
          - paragraph [ref=e62]: ⚠️ Save the workflow first to manage secrets.
          - generic [ref=e63]:
            - paragraph [ref=e64]: "Usage in steps:"
            - code [ref=e65]: "{{SECRET_NAME}}"
            - paragraph [ref=e66]: "Reference any secret in step config fields using the {{KEY}} syntax."
    - generic [ref=e68]:
      - generic [ref=e70]:
        - heading "Workflow Canvas" [level=3] [ref=e71]
        - button "Help" [ref=e72] [cursor=pointer]:
          - img [ref=e73]
      - generic [ref=e77]:
        - generic:
          - img
          - paragraph: Drop steps here to build your workflow
          - paragraph: Click a step in the catalog or drag it onto the canvas
        - generic [ref=e78]:
          - button "AI Assist" [ref=e79] [cursor=pointer]:
            - img [ref=e80]
            - text: AI Assist
          - button "🌐 API + AI template" [ref=e83] [cursor=pointer]
          - button "📧 Notify template" [ref=e84] [cursor=pointer]
    - generic [ref=e86]:
      - generic [ref=e87]:
        - heading "Step Catalog" [level=3] [ref=e88]
        - textbox "Search steps…" [ref=e89]
      - generic [ref=e90]:
        - button "🌐 HTTP Request Call any REST API" [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]: 🌐
            - generic [ref=e94]:
              - generic [ref=e95]: HTTP Request
              - generic [ref=e96]: Call any REST API
        - button "🤖 AI Processing Run an LLM prompt" [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: 🤖
            - generic [ref=e100]:
              - generic [ref=e101]: AI Processing
              - generic [ref=e102]: Run an LLM prompt
        - button "🔄 Data Transform Reshape or filter data" [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e105]: 🔄
            - generic [ref=e106]:
              - generic [ref=e107]: Data Transform
              - generic [ref=e108]: Reshape or filter data
        - button "🔀 Condition/Branch True/false branching" [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: 🔀
            - generic [ref=e112]:
              - generic [ref=e113]: Condition/Branch
              - generic [ref=e114]: True/false branching
        - button "⏱️ Delay Wait N milliseconds" [ref=e115]:
          - generic [ref=e116]:
            - generic [ref=e117]: ⏱️
            - generic [ref=e118]:
              - generic [ref=e119]: Delay
              - generic [ref=e120]: Wait N milliseconds
        - button "📧 Email Send Send transactional email" [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]: 📧
            - generic [ref=e124]:
              - generic [ref=e125]: Email Send
              - generic [ref=e126]: Send transactional email
        - button "💬 Twilio SMS Send SMS via Twilio" [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]: 💬
            - generic [ref=e130]:
              - generic [ref=e131]: Twilio SMS
              - generic [ref=e132]: Send SMS via Twilio
```

# Test source

```ts
  1   | /**
  2   |  * Workflow Builder — 10-Dimension Maturity Rubric
  3   |  *
  4   |  * Rubric (each dimension scored 1–10 by the AI vision model):
  5   |  *
  6   |  *  D1  Visual Canvas        — Node-based flow vs linear list. Competitor: n8n, Zapier
  7   |  *  D2  Data Mapping         — Visual output→input wiring. Competitor: Make.com, n8n
  8   |  *  D3  Step Configuration   — Richness of per-type forms. Competitor: Postman Flows
  9   |  *  D4  Trigger UX           — Webhook URL, cron builder, API docs. Competitor: Zapier
  10  |  *  D5  Validation & Debug   — Inline errors, test-run, execution logs. Competitor: n8n
  11  |  *  D6  Onboarding / Empty   — Guidance, templates, AI assist. Competitor: Make.com
  12  |  *  D7  Visual Polish        — Typography, spacing, icons, motion. Competitor: Linear
  13  |  *  D8  Responsiveness       — Tablet + keyboard accessibility. Competitor: Notion
  14  |  *  D9  Auth & Secrets UX    — Secrets management clarity. Competitor: Vercel
  15  |  *  D10 Saving & Versioning  — Autosave, undo, version history. Competitor: Figma
  16  |  *
  17  |  * Each test asks the AI to score one dimension and log suggestions.
  18  |  * The final test aggregates all dimension scores into a composite grade.
  19  |  */
  20  | 
  21  | import { test, expect } from '@playwright/test';
  22  | import { authenticateAs } from './helpers/auth';
  23  | import { analyzeScreen, auditScreen, VISION_MODEL_DEEP } from './helpers/ai-vision';
  24  | import * as fs from 'fs';
  25  | import * as path from 'path';
  26  | 
  27  | // ── Score tracker (shared across tests via global) ─────────────────────
  28  | const roundScores: Record<string, number | null> = {};
  29  | 
  30  | function recordScore(dim: string, answer: string) {
  31  |   const match = String(answer).match(/(\d+)/);
  32  |   roundScores[dim] = match ? parseInt(match[1], 10) : null;
  33  | }
  34  | 
  35  | function appendToHistory(notes: string = '') {
  36  |   const histPath = path.join(__dirname, 'rubric-history.json');
  37  |   const history = JSON.parse(fs.readFileSync(histPath, 'utf8'));
  38  |   const lastRound = history.runs[history.runs.length - 1]?.round ?? 0;
  39  |   history.runs.push({
  40  |     round: lastRound + 1,
  41  |     date: new Date().toISOString().slice(0, 10),
  42  |     scores: {
  43  |       D1: roundScores['D1'] ?? null,
  44  |       D2: roundScores['D2'] ?? null,
  45  |       D3: roundScores['D3'] ?? null,
  46  |       D4: roundScores['D4'] ?? null,
  47  |       D5: roundScores['D5'] ?? null,
  48  |       D6: roundScores['D6'] ?? null,
  49  |       D7: roundScores['D7'] ?? null,
  50  |       D8: roundScores['D8'] ?? null,
  51  |       D9: roundScores['D9'] ?? null,
  52  |       D10: roundScores['D10'] ?? null,
  53  |       composite: null,
  54  |     },
  55  |     notes,
  56  |   });
  57  |   fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
  58  |   return history.runs[history.runs.length - 1];
  59  | }
  60  | 
  61  | const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
  62  | const TENANT_ID = process.env.E2E_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  63  | const NEW_BUILDER_PATH = `/tenants/${TENANT_ID}/apps/new`;
  64  | 
  65  | // ── Shared setup: build a 3-step workflow ─────────────────────────────
  66  | 
  67  | async function buildDemoWorkflow(page: Parameters<typeof authenticateAs>[0]) {
  68  |   await authenticateAs(page, NEW_BUILDER_PATH, {
  69  |     jwtSecret: JWT_SECRET,
  70  |     tenantId: TENANT_ID,
  71  |     isSystemAdmin: true,
  72  |   });
  73  |   await page.waitForTimeout(1500);
  74  |   await page.getByPlaceholder('My Workflow').fill('Customer Inquiry Handler');
  75  |   await page.getByPlaceholder('Describe what this workflow does').fill(
  76  |     'Receives a customer inquiry via webhook, classifies it with AI, then routes to email or SMS.'
  77  |   );
  78  |   // Add steps (click catalog items)
> 79  |   await page.getByText('HTTP Request').first().click();
      |                                                ^ Error: locator.click: Test timeout of 90000ms exceeded.
  80  |   await page.waitForTimeout(300);
  81  |   await page.getByText('AI Processing').first().click();
  82  |   await page.waitForTimeout(300);
  83  |   await page.getByText('Condition/Branch').first().click();
  84  |   await page.waitForTimeout(500);
  85  | }
  86  | 
  87  | // ── D1: Visual Canvas ─────────────────────────────────────────────────
  88  | 
  89  | test('D1 — Visual Canvas: node-based flow vs linear list', async ({ page }) => {
  90  |   await buildDemoWorkflow(page);
  91  | 
  92  |   const result = await analyzeScreen(
  93  |     page,
  94  |     'Score this workflow canvas from 1-10 for VISUAL CANVAS quality, compared to n8n and Zapier. ' +
  95  |     'Specifically: (a) Are steps rendered as connected nodes on a canvas with edges/arrows between them? ' +
  96  |     '(b) Is there a minimap? Controls (zoom/fit)? ' +
  97  |     '(c) Can you visually see the flow from trigger → step 1 → step 2 → step 3? ' +
  98  |     '(d) Does it feel like a production workflow builder or a list UI? ' +
  99  |     'Return score as a number 1-10 in "answer", detailed observations in "reasoning", and competitor-parity improvements in "suggestions".',
  100 |     VISION_MODEL_DEEP
  101 |   );
  102 | 
  103 |   recordScore('D1', result.answer);
  104 |   console.log('\n\n📊 D1 — VISUAL CANVAS');
  105 |   console.log(`   Score: ${result.answer}/10`);
  106 |   console.log(`   Assessment: ${result.reasoning}`);
  107 |   if (result.suggestions.length) {
  108 |     console.log('   To improve:');
  109 |     result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  110 |   }
  111 | 
  112 |   expect(result.answer).toBeDefined();
  113 | });
  114 | 
  115 | // ── D2: Data Mapping ──────────────────────────────────────────────────
  116 | 
  117 | test('D2 — Data Mapping: visual output→input field wiring', async ({ page }) => {
  118 |   await buildDemoWorkflow(page);
  119 |   await page.waitForTimeout(800);
  120 | 
  121 |   // Click the AI Processing node on the canvas to open its config panel
  122 |   const aiNode = page.locator('.react-flow__node').filter({ hasText: 'AI Processing' }).first();
  123 |   if (await aiNode.count() > 0) {
  124 |     await aiNode.click();
  125 |     await page.waitForTimeout(600);
  126 |     // Switch to the Map Data tab if present
  127 |     const mapDataTab = page.getByRole('button', { name: /map data/i });
  128 |     if (await mapDataTab.count() > 0) {
  129 |       await mapDataTab.click();
  130 |       await page.waitForTimeout(400);
  131 |     }
  132 |   }
  133 | 
  134 |   const result = await analyzeScreen(
  135 |     page,
  136 |     'Score 1-10 for DATA MAPPING UX, compared to Make.com and n8n. ' +
  137 |     'Specifically: (a) When configuring a step, can the user see available output fields from upstream steps? ' +
  138 |     '(b) Is there a visual way to map/wire data from a previous step output into the current step input? ' +
  139 |     '(c) Can the user use syntax like {{stepId.field}} or drag-and-drop field references? ' +
  140 |     '(d) Is it clear how to pass data from one step to the next? ' +
  141 |     'Return score 1-10 in "answer".',
  142 |     VISION_MODEL_DEEP
  143 |   );
  144 | 
  145 |   recordScore('D2', result.answer);
  146 |   console.log('\n\n📊 D2 — DATA MAPPING');
  147 |   console.log(`   Score: ${result.answer}/10`);
  148 |   console.log(`   Assessment: ${result.reasoning}`);
  149 |   if (result.suggestions.length) {
  150 |     console.log('   To improve:');
  151 |     result.suggestions.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  152 |   }
  153 | 
  154 |   expect(result.answer).toBeDefined();
  155 | });
  156 | 
  157 | // ── D3: Step Configuration ────────────────────────────────────────────
  158 | 
  159 | test('D3 — Step Configuration: richness of per-type forms', async ({ page }) => {
  160 |   await authenticateAs(page, NEW_BUILDER_PATH, { jwtSecret: JWT_SECRET, tenantId: TENANT_ID, isSystemAdmin: true });
  161 |   await page.waitForTimeout(1000);
  162 | 
  163 |   // Add via catalog click, then open node config
  164 |   await page.getByText('HTTP Request').first().click();
  165 |   await page.waitForTimeout(600);
  166 | 
  167 |   // Click the node on the canvas
  168 |   const node = page.locator('.react-flow__node').filter({ hasText: 'HTTP Request' }).first();
  169 |   if (await node.count() > 0) {
  170 |     await node.click();
  171 |   } else {
  172 |     await page.getByText('HTTP Request', { exact: false }).nth(1).click();
  173 |   }
  174 |   await page.waitForTimeout(800);
  175 | 
  176 |   // Set method to POST so Body field renders
  177 |   const methodSelect = page.locator('select').filter({ hasText: /GET|POST/ }).first();
  178 |   if (await methodSelect.count() > 0) {
  179 |     await methodSelect.selectOption('POST');
```