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
