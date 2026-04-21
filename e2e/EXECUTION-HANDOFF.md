# Lookout Portal — Execution Engine Rubric Handoff (Slice 6.x)

## What this is

A Playwright rubric for the **Execution Engine** introduced in Slice 6.x. Ten dimensions covering both backend correctness (E1–E5, API assertions) and portal UI quality (E6–E10, AI vision scoring). Parallels the existing App Builder rubric (`HANDOFF.md` / `agents.json` / `rubric.spec.ts`) but graded against the platform-tenant Jobs tab and the execution pipeline.

## Dimensions

### Backend (E1–E5) — API assertion scoring

| Dim | Target |
|-----|--------|
| E1  | `POST /v1/tenants/:tenantId/apps/:appId/execute` creates AppExecution row with correct initial state |
| E2  | `GET /v1/platform/apps/:appId/executions/:id` returns `currentStepIndex`, `totalSteps`, `currentStepName`, heartbeat + cost fields |
| E3  | Lifecycle webhooks fire at correct transitions (`started`, `step_completed`, `completed`) with valid HMAC signature |
| E4  | Concurrency policy enforced — second trigger on `concurrencyPolicy=none` app rejected with 409 `DISPATCH_REJECTED` |
| E5  | `POST .../cancel/:id` marks execution `cancelling` → `cancelled` within grace window; Fly machine destroyed |

Backend dims are **graded only** — no agent mutations. They assert against the API directly and return a structured 0/5/10 score.

### UI (E6–E10) — AI vision scoring (mutation-eligible)

| Dim | Target |
|-----|--------|
| E6  | Jobs tab renders — execution list, status badges, timestamps, cost display |
| E7  | Progress bar shows "Step N of M — {stepName}" for running executions |
| E8  | Concurrency warning dialog appears correctly on re-trigger of `none`/`replace`-policy apps |
| E9  | Execution detail drawer — step timeline, per-step output, error details, machineId/type |
| E10 | Platform admin Jobs tab overall — platform-tenant app executions visible and actionable |

UI dims use the same `analyzeScreen()` helper as the App Builder rubric. Agents can edit only `src/components/platform/PlatformJobsTab.tsx` and `src/pages/PlatformAdmin.tsx` (see Protected Files below).

## Protected files

On top of the global App Builder rubric's protections:
- `prisma/schema.prisma` (both repos) — migrations only
- `src/lib/execution/` — core engine code; agents can edit portal UI only
- `src/worker.ts` — worker entrypoint; human-only
- `src/lib/execution/machine-runner.ts` — Fly dispatch; human-only
- Backend dims are **never** mutated by agents — too risky for correctness guarantees

## Running

```bash
# Grade current state (no agents)
pnpm rubric:execution:grade

# Grade UI dims only (eligible for agent mutation)
pnpm rubric:execution:ui

# Backend dims only (grading-only, no mutation)
pnpm rubric:execution:backend

# Single dim
bash e2e/orchestrate-execution.sh --dim E6
```

## Prerequisites

- `lookout-local` running (`just serve`)
- Platform tenant seeded (`just seed-platform`)
- `lookout-workers` container healthy
- At least one execution row exists (portal tab triggers one via "Run" button)

## Status

**Round 0 (initial):** All dims not yet graded. E6–E10 agent prompts are placeholders until first grading round shows actual regressions.

The `reflect.mjs` mechanism used in the App Builder rubric is reusable for execution-agents.json if the rubric+orchestrator harness is forked. Suggested next step: copy `orchestrate.sh` → `orchestrate-execution.sh` and adjust paths to `rubric-execution.spec.ts` + `execution-agents.json`.
