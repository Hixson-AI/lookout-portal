# Lookout Portal — App Builder Rubric Handoff

## What this is

An AI-driven iterative improvement loop for the Lookout Portal's **App Builder UI** (`/tenants/:id/apps/new`). A Playwright rubric (11 dimensions, D1–D10 + composite) grades the UI via AI vision screenshots. An orchestrator spawns sub-agents per dim, runs tsc gates, rebuilds Docker, re-grades, then runs a reflection agent that rewrites `agents.json` for the next round.

## Current scores (Round 6 — latest)

| Dim | Score | Notes |
|-----|-------|-------|
| D1  | 7/10  | React Flow canvas — nodes render, edges ok |
| D2  | 6/10  | Data mapping panel — regression from 9 (agents.json will fix) |
| D3  | 4/10  | Step config form ordering |
| D4  | 5/10  | Trigger node — webhook URL shown, cron UX weak |
| D5  | 2/10  | Step test button + validation error dots — lowest |
| D6  | 6/10  | Onboarding / help UX |
| D7  | 6/10  | Visual polish |
| D8  | 4/10  | Layout / responsiveness |
| D9  | 3/10  | Secrets panel |
| D10 | 2/10  | Autosave + undo — lowest |
| composite | 4/10 | |

**Priority targets this session: D5, D10, D9** (lowest 3).

## Repo layout

```
/home/garrett/repos/work/hixson-ai/lookout-portal/   ← main repo
  src/pages/AppBuilder.tsx                            ← main page (~855 lines, large)
  src/components/workflow/
    FlowCanvas.tsx        ← React Flow canvas (@xyflow/react ^12.10.2)
    StepConfigPanel.tsx   ← per-step config forms
    DataMappingPanel.tsx  ← data mapping UI
  e2e/
    orchestrate.sh        ← orchestrator (main entry point)
    agents.json           ← per-dim model + prompt config (mutated by reflect.mjs)
    reflect.mjs           ← post-run reflection: rewrites agents.json on regressions
    rubric.spec.ts        ← 11-dimension Playwright rubric
    rubric-history.json   ← score history across rounds
    helpers/
      auth.ts             ← authenticateAs() helper for Playwright
      ai-vision.ts        ← analyzeScreen() — calls vision LLM on screenshots
    runs/<timestamp>/     ← per-run artifacts: .patch, .log, tsc-before/after.log

/home/garrett/repos/work/hixson-ai/lookout-local/    ← docker-compose
  docker-compose.yml      ← builds lookout-portal container from ../lookout-portal
```

## Key architecture decisions (do not change)

- **Protected files** — agents must never touch: `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `src/App.tsx`, `src/lib/api/index.ts`, `src/lib/types.ts`, `playwright.config.ts`
- **Docker build** — portal is served as nginx static (production build). Vite bundles everything. `@xyflow/react@^12.10.2` is in `package.json` dependencies.
- **React Flow** — `useNodesState`/`useEdgesState` init is one-shot; a `useEffect` syncs nodes on `steps` changes. All props to `FlowCanvas` must be `useMemo`/`useCallback` stable refs or the effect fires on every render.
- **Auth pattern** — routes use inline `user ? <Component/> : <Navigate to="/login"/>`. No `ProtectedRoute` wrapper.
- **CDPATH bug** — the system's `CDPATH` env var causes `cd && pwd` to echo the path twice. Fixed with `cd ... > /dev/null 2>&1 && pwd` in orchestrate.sh line 33. Don't revert this.

## How to run

```bash
# Quick smoke test — tsc only
pnpm rubric:tsc

# Grade current build (no agents, no rebuild)
pnpm rubric:grade

# Target a single dim
bash e2e/orchestrate.sh --dim D5

# Run lowest 3 dims only (fast loop)
pnpm rubric:light

# Full cycle: plan → agents → tsc gates → rebuild → full rubric → reflect
pnpm rubric:orchestrate
```

All scripts need `OPENROUTER_E2E_KEY` in `.env.e2e` and `JWT_SECRET` + `TENANT_ID` for Playwright auth.

## How the orchestrator works

1. **Baseline tsc** — fail fast if codebase is already broken
2. **Planner** (claude-sonnet-4.6) — reads score trends, writes `eval-plan.md`
3. **Agents** — 3 parallel sub-agents (one per lowest dim), model + prompt from `agents.json`
4. **Scope check** — auto-reverts any protected files agents touched
5. **Post-agent tsc** — auto-reverts `src/` if agents introduced type errors
6. **Security scan** — claude-sonnet-4.6 reviews changed .ts/.tsx files
7. **Lockfile restore** — `git checkout HEAD -- package.json pnpm-lock.yaml` (agents must not change these)
8. **Docker rebuild** — `docker compose up --build --no-cache`
9. **Rubric** — Playwright runs the graded dimensions
10. **Reflect** — `reflect.mjs` reads score deltas, calls claude-sonnet-4.6, rewrites `agents.json` for regressions

## Known issues / context

- `oe.some is not a function` was a React Flow crash caused by `errorStepIds = new Set()` being recomputed every render (new ref → unstable `FlowCanvas` useEffect dep → continuous `setRfNodes` calls). Fixed with `useMemo` in `AppBuilder.tsx` and a `useCallback` for `handleSelectStep`.
- `AppBuilder.tsx` is ~855 lines — agents are instructed to split if they touch it. Watch for it growing.
- D4 (Trigger UX) — the `TriggerNode` in `FlowCanvas.tsx` shows the webhook URL. Cron schedule + human-readable preview is the remaining gap.
- D2 regressed R5→R6 (9→6) — `reflect.mjs` should have updated the D2 prompt. Check `agents.json` D2 entry after next run.

## Environment

- Node v25.8.0, pnpm 9, Docker, Playwright 1.59
- Models available: `openrouter/anthropic/claude-sonnet-4.6`, `openrouter/moonshotai/kimi-k2`, `openrouter/minimax/minimax-m2.5`, `openrouter/google/gemini-2.5-pro`
- Agent CLI: `kilo` (Kilo Code)
