# Slice 4.3: Turbo Builder Chat

## Overview

Replace the static AI Assist button in the App Builder with a live, multi-turn conversational AI experience powered by RAG-backed step catalog search and OpenAI-format UI tool calls.

**Repo**: `hixson-ai/lookout-portal`
**Goal**: Operators describe what they want to automate in plain language; the AI builds the workflow through conversation and adds steps directly to the canvas
**Status**: ✅ Implemented (2026-04-20)

## Success Criteria

- [x] Empty canvas shows `BuilderChat` panel instead of static template buttons
- [x] AI responds with inline interactive widgets (step picker, field input, choice select, confirm)
- [x] `confirm_add_steps` adds steps + trigger to canvas in one click
- [x] Step catalog dynamically fetched from `/v1/catalog/steps` (not hardcoded)
- [x] Canvas has steps → chat collapses to floating button; click to open as fixed right panel
- [x] StepConfigPanel rendered in a `<Dialog>` — no more layout squish

## Dependencies

- **lookout-control Slice 6 Addendum**: `POST /v1/catalog/steps/reindex` run at least once; `OPENAI_API_KEY` set in Fly secrets
- **Tenant AI key**: Tenant must have an active OpenRouter key (existing requirement)

## New Files

| File | Purpose |
|---|---|
| `src/components/workflow/BuilderChat.tsx` | Full chat panel: message thread, widget rendering, `onApplySteps` callback |
| `src/components/workflow/ChatWidgets.tsx` | `StepPickerWidget`, `FieldInputWidget`, `ChoiceSelectWidget`, `ConfirmAddStepsWidget` |

## Changed Files

| File | Change |
|---|---|
| `src/pages/AppBuilder.tsx` | Live catalog fetch, `BuilderChat` in empty state, Dialog config panel, floating chat |
| `src/lib/api/steps.ts` | Added `getCatalog()` → `GET /v1/catalog/steps` |
| `src/lib/api/agents.ts` | Added `chat()` + `ChatApiMessage`, `ChatResult`, `ToolCallProps` types |
| `src/components/ui/dialog.tsx` | Added `className` prop for custom max-width |

## Architecture

### Chat Flow

```
User types → POST /v1/tenants/:id/agents/chat
  → BuilderChatAgent embeds message → searchStepCatalog (RAG)
  → System prompt injected with top-N relevant steps
  → LLM (OpenRouter) called with 4 UI tool definitions
  → Response: { text, toolCall, rawToolCalls }
Portal renders:
  text → chat bubble
  toolCall → interactive widget (step_picker / field_input / choice_select / confirm_add_steps)
User interacts with widget → result sent back as tool message → next turn
confirm_add_steps confirmed → onApplySteps() → steps added to canvas → chat collapses
```

### Canvas Empty State Behavior

- `workflow.steps.length === 0` → `<BuilderChat collapsed={false}>` fills canvas area
- `workflow.steps.length > 0 && chatCollapsed` → floating `⚡` button (fixed bottom-right)
- `workflow.steps.length > 0 && !chatCollapsed` → fixed right panel (w-96, full height)

### StepConfigPanel Dialog

Previously rendered as an inline card below the canvas, squishing the layout. Now opens as `<Dialog className="max-w-2xl">` with Config / Data Mapping tabs and Test Step button.

## No Environment Variable Changes

No new portal-side env vars. The `OPENAI_API_KEY` lives only in `lookout-control`.

## Next Slice

**Slice 4.4 candidates**:
- Seed the `agent_steps` DB table with the platform's built-in steps (HTTP Request, AI Processing, etc.) so the catalog is non-empty by default
- Stream AI responses (SSE) instead of single-shot for better perceived latency
- Persist chat history per-app so the AI remembers previous conversations

---

## 4.3 Addendum: Required Secrets Discovery and Management (2026-04-27)

### Overview

Proactively surface missing credentials to tenants by computing required secrets from workflow JSON against the catalog, diffing against existing `AppSecret` rows, and displaying the results in the portal.

### Backend (lookout-control)

- `computeRequiredSecrets(prisma, workflowJson)` helper — walks workflow JSON tree, queries both `agentStep` (by `id`) and `agentAction` (by `actionType`) for secret schemas, dedupes by key, tracks `unknown_step_ids`
- `GET /v1/tenants/:tenantId/apps/:appId/required-secrets` — computes required secrets diff vs existing `AppSecret` rows, excludes auto-injected AI keys (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`)
- `POST /v1/tenants/:tenantId/apps/:appId/required-secrets/augment` — LLM augmentation via `SecretSchemaAgent` for unknown stepIds, validates entries have `key`, `type`, `required`, tags LLM-only entries with `source: 'ai'`
- `GET /v1/tenants/:tenantId/required-secrets` — tenant-wide rollup with `by_app` and `by_key` groupings, `missing_total`, `extra_total`
- `manage_required_secrets` tool added to `BuilderChatAgent` UI_TOOLS with system prompt rule

### Frontend (lookout-portal)

- `RequiredSecretsPanel` component — displays missing, present, extra secrets with inline editing, "Re-analyze with AI" button gated on `unknown_step_ids.length > 0`
- `AppsTab` — lazily fetches missing-count per app, renders badge with "N missing" next to app name
- `TenantSecrets` page — dedicated page at `/tenants/:id/secrets` with By Key (clickable app links) and By App tabs
- `RequiredSecretsWidget` — wraps panel with Done (fetches final diff, returns summary to LLM) and Skip buttons, dispatched in BuilderChat
- `App.tsx` — lazy-loaded heavy routes (TenantSecrets, AppBuilder, PlatformAdmin) to reduce main chunk size
- `vite.config.ts` — manual chunks for vendor libraries (react, xyflow, query)

### Files Changed

| File | Change |
|---|---|
| `src/lib/api/app-secrets.ts` | Added `RequiredSecretsDiff`, `TenantRequiredSecretsRollup` interfaces and `getAppRequiredSecrets`, `augmentAppRequiredSecrets`, `getTenantRequiredSecrets` functions |
| `src/components/secrets/RequiredSecretsPanel.tsx` | New component for displaying and managing required secrets |
| `src/components/tenants/AppsTab.tsx` | Integrated `RequiredSecretsPanel`, added missing-count badges |
| `src/pages/TenantSecrets.tsx` | New page for tenant-wide secrets rollup |
| `src/App.tsx` | Added route for `/tenants/:id/secrets`, lazy-loaded heavy routes |
| `src/pages/TenantDetail.tsx` | Added "Manage Secrets" nav button |
| `src/components/workflow/ChatWidgets.tsx` | Added `RequiredSecretsWidget` with Done/Skip buttons |
| `src/components/workflow/BuilderChat.tsx` | Added `appId` prop, dispatched `RequiredSecretsWidget` for `manage_required_secrets` tool |
| `src/pages/AppBuilder.tsx` | Passed `appId` to `BuilderChat` |
| `vite.config.ts` | Added manual chunks for vendor libraries |

### Tests

- `lookout-control/test/routes/required-secrets.test.ts` — 5 unit tests for `computeRequiredSecrets` (union, dedup, unknown-step tracking, deep tree walk, empty input)
