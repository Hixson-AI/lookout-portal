#!/usr/bin/env node
// reflect.mjs — post-run agent self-improvement
//
// Usage: node e2e/reflect.mjs <run_id>
//
// Reads rubric-history.json score deltas from the latest run, then invokes a
// reflection LLM that rewrites agents.json for each dim that regressed or stalled.

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTAL_DIR = join(__dirname, '..');
const AGENTS_FILE = join(__dirname, 'agents.json');
const HISTORY_FILE = join(__dirname, 'rubric-history.json');

const REFLECTION_MODEL = 'openrouter/anthropic/claude-sonnet-4.6';
const KILO = 'kilo';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node e2e/reflect.mjs <run_id>');
  process.exit(1);
}

// ── Load data ─────────────────────────────────────────────────────────
const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
const agents = JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));

const runs = history.runs;
if (runs.length < 2) {
  console.log('Not enough runs for reflection (need at least 2). Skipping.');
  process.exit(0);
}

const prev = runs[runs.length - 2].scores;
const curr = runs[runs.length - 1].scores;

// ── Compute deltas ────────────────────────────────────────────────────
const dims = Object.keys(agents).filter(k => !k.startsWith('_'));
const deltas = dims.map(dim => ({
  dim,
  prev: prev[dim] ?? null,
  curr: curr[dim] ?? null,
  delta: (curr[dim] ?? 0) - (prev[dim] ?? 0),
}));

// Only reflect on dims that regressed (delta < 0) or stalled at < 7 for 2+ rounds
const needsReflection = deltas.filter(d =>
  d.delta < 0 || (d.delta === 0 && d.curr !== null && d.curr < 7)
);

if (needsReflection.length === 0) {
  console.log('✅ All dims improved or are passing — no reflection needed.');
  process.exit(0);
}

console.log(`\n🪞 Reflecting on ${needsReflection.length} dims: ${needsReflection.map(d => d.dim).join(', ')}`);

// ── Build score trend table ───────────────────────────────────────────
const trend = dims.map(d => {
  const vals = runs.slice(-4).map(r => r.scores[d] ?? '?').join(' → ');
  return `${d}: ${vals}`;
}).join('\n');

// ── Build per-dim context ─────────────────────────────────────────────
const dimContext = needsReflection.map(d => {
  const cfg = agents[d.dim];
  const runDir = join(__dirname, 'runs', runId);
  let patchSummary = '';
  try {
    const patch = readFileSync(join(runDir, `${d.dim}.patch`), 'utf-8');
    patchSummary = patch.slice(0, 1000); // First 1000 chars of diff
  } catch { patchSummary = '(no patch found)'; }

  return `### ${d.dim} (${d.prev}/10 → ${d.curr}/10, delta: ${d.delta})
Current model: ${cfg.model}
Current temperature: ${cfg.temperature}
Current prompt: ${cfg.prompt}
Notes: ${cfg.notes}
Patch excerpt:
\`\`\`
${patchSummary}
\`\`\``;
}).join('\n\n');

// ── Build available models list ───────────────────────────────────────
const AVAILABLE_MODELS = [
  'openrouter/anthropic/claude-sonnet-4.6',
  'openrouter/moonshotai/kimi-k2',
  'openrouter/minimax/minimax-m2.5',
  'openrouter/google/gemini-2.5-pro',
];

// ── Reflection prompt ─────────────────────────────────────────────────
const reflectionPrompt = `You are an agent configuration optimizer for a UI improvement loop.

## Score Trends (last 4 rounds)
${trend}

## Dims needing reflection
${dimContext}

## Available models
${AVAILABLE_MODELS.join('\n')}

## Your task
For each dim listed above, output an improved agent config. You MUST output ONLY valid JSON — no prose, no markdown fences, just the JSON object.

The JSON must have this exact shape:
{
  "D1": { "model": "...", "temperature": 0.2, "prompt": "...", "notes": "..." },
  "D5": { "model": "...", "temperature": 0.2, "prompt": "...", "notes": "..." }
}

Rules:
1. Only include dims that need changes (the ones listed above).
2. For each dim, decide: should we change the model, tighten the prompt, or both?
3. If the patch shows the agent made wrong changes (wrong file, wrong element), rewrite the prompt with more surgical specificity.
4. If the agent made no changes (empty patch), try a different model.
5. If the agent made changes but score regressed, tighten the prompt to be more conservative.
6. temperature must stay between 0.1 and 0.4.
7. Each prompt must start with "Edit ONLY: <file(s)>." and be as specific as possible.
8. Keep notes brief — explain why you made this change.`;

// ── Run reflection ────────────────────────────────────────────────────
const promptFile = join(__dirname, 'runs', runId, 'reflect-prompt.txt');
const reflectLog = join(__dirname, 'runs', runId, 'reflect.log');
writeFileSync(promptFile, reflectionPrompt);

console.log(`   Calling ${REFLECTION_MODEL}...`);
try {
  execSync(`cat "${promptFile}" | ${KILO} run --auto --model "${REFLECTION_MODEL}" > "${reflectLog}" 2>&1`, {
    cwd: PORTAL_DIR,
    timeout: 120000,
  });
} catch {
  console.warn('   Reflection model call failed (non-fatal)');
}

// ── Parse and apply updates ───────────────────────────────────────────
let rawOutput = '';
try {
  rawOutput = readFileSync(reflectLog, 'utf-8');
} catch {
  console.warn('   No reflection output found');
  process.exit(0);
}

// Extract JSON from output (handle model preamble/postamble)
const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  console.warn('   No JSON found in reflection output. Skipping update.');
  console.warn('   Output:', rawOutput.slice(0, 200));
  process.exit(0);
}

let updates;
try {
  updates = JSON.parse(jsonMatch[0]);
} catch (e) {
  console.warn('   Failed to parse reflection JSON:', e.message);
  process.exit(0);
}

// Apply updates to agents.json
let changed = 0;
for (const [dim, cfg] of Object.entries(updates)) {
  if (!agents[dim]) {
    console.warn(`   Unknown dim ${dim} — skipping`);
    continue;
  }
  const before = JSON.stringify(agents[dim]);
  agents[dim] = { ...agents[dim], ...cfg };
  const after = JSON.stringify(agents[dim]);
  if (before !== after) {
    console.log(`   ✏️  ${dim}: model=${agents[dim].model.split('/').pop()}, temp=${agents[dim].temperature}`);
    changed++;
  }
}

if (changed > 0) {
  agents._meta.updated = new Date().toISOString().split('T')[0];
  agents._meta.version = (agents._meta.version ?? 0) + 1;
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2) + '\n');
  console.log(`\n✅ agents.json updated (${changed} dims changed) → e2e/agents.json`);
} else {
  console.log('\n   No changes applied (configs already optimal).');
}
