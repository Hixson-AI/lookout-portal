# Lookout Portal

Operator portal for the Lookout platform.

## Overview

React SPA for Hixson operators to manage tenants, build workflow automation apps, and monitor platform health.

**Stack**: TypeScript, React 18, Vite, Tailwind CSS, React Router v7
**Architecture**: `docs/09-repositories.md` in platform-architecture repo

## Status

- [x] Slice 1: Skeleton + CI
- [x] Slice 4.1: App Builder MVP (flow canvas, step config, data mapping)
- [x] Slice 4.3: Turbo Builder Chat (AI-driven workflow builder with Action Library RAG)
- [ ] Slice 4.4: Seed built-in actions so library is non-empty by default
- [ ] Slice 8: Basic Dashboard

## Quick Start

```bash
pnpm install
pnpm dev          # start Vite dev server
pnpm test         # run vitest unit tests
pnpm test:e2e     # run Playwright e2e tests (requires running app + backend)
pnpm build        # production build
```

## Architecture

- **Layer**: Experience surfaces
- **Deploys to**: Fly.io (nginx serving static build)
- **Dependencies**: `lookout-control` control plane API, Grafana

## App Builder

The App Builder (`src/pages/AppBuilder.tsx`) is the primary feature surface:

```
┌─────────────────┬───────────────────────────┬────────────────────┐
│  Settings       │  Flow Canvas              │  Action Library    │
│  (trigger,      │  (drag-drop, reorder,     │  (searchable list  │
│  name, secrets) │  connect steps)           │  from API)         │
└─────────────────┴───────────────────────────┴────────────────────┘
                  │  BuilderChat              │
                  │  (empty canvas state /    │
                  │  floating panel)          │
```

- **Empty canvas**: `BuilderChat` fills the canvas area — AI guides the operator through building the workflow conversationally
- **Canvas has steps**: Chat collapses to a `⚡` floating button (bottom-right); click to open as a fixed right panel
- **Step config**: Opens as a `<Dialog>` (max-w-2xl) — no layout squish

## Builder Chat System

Conversational AI that builds workflows step-by-step via interactive widgets.

### Chat flow

```
User message → POST /v1/tenants/:id/agents/chat (control plane)
  → BuilderChatAgent embeds message → RAG cosine search over Action Library
  → System prompt injected with top-N relevant actions
  → LLM (OpenRouter) called with 4 UI tool definitions
  → Response: { text, toolCall, rawToolCalls }
Portal renders tool call as a widget inline in the chat thread
User interacts → result sent back as next turn
confirm_add_steps confirmed → steps added to canvas
```

### Chat widgets (`src/components/workflow/ChatWidgets.tsx`)

| Widget | Tool call | Purpose |
|---|---|---|
| `StepPickerWidget` | `step_picker` | Card grid to select one or more actions |
| `FieldInputWidget` | `field_input` | Single value input with 27 validated types |
| `ChoiceSelectWidget` | `choice_select` | Single-select option list |
| `ConfirmAddStepsWidget` | `confirm_add_steps` | Summary card → adds steps to canvas |

## Field Validators

`src/lib/field-validators.ts` exports `VALIDATORS`, `HTML_TYPE`, `TEXTAREA_TYPES` used by `FieldInputWidget`.

27 types with client-side validation:

| Group | Types |
|---|---|
| Text | `text`, `textarea`, `password`, `slug`, `template`, `regex` |
| Identity | `uuid`, `jwt`, `color` |
| Contact | `email`, `csv-emails`, `phone`, `country-code` |
| Network | `url`, `ip-address`, `port` |
| Numeric | `number`, `integer`, `percentage`, `currency` |
| Time | `date`, `time`, `datetime`, `timezone`, `duration`, `cron` |
| Structured | `json` |

When the AI provides a `default_value`, the widget renders a read-only chip + one-click Confirm. The user can click **Edit** to override.

## Testing

```bash
pnpm test          # vitest unit tests (CI-safe, no browser)
pnpm test:e2e      # playwright e2e (requires running app)
```

**Unit tests** (`src/__tests__/field-validators.test.ts`): 60 tests covering all 27 field type validators + HTML_TYPE + TEXTAREA_TYPES.

**Playwright tests** (`e2e/chat-widgets.spec.ts`): all 4 widgets tested via mocked `POST /v1/tenants/*/agents/chat` responses. No live backend required.

> Playwright is **not** run in CI (`pnpm test` is vitest only). Run `pnpm test:e2e` locally or in a dedicated e2e job.

## Environment Variables

### Build-time (VITE_ prefix)

| Variable | Purpose |
|---|---|
| `VITE_CONTROL_PLANE_URL` | Control plane API base URL |
| `VITE_API_BASE_URL` | Client API base URL |
| `VITE_GRAFANA_URL` | Grafana dashboard URL |
| `VITE_ADMIN_SUBDOMAIN` | Admin subdomain (default: `admin`) |

### GitHub Secrets / Variables (dev environment)

| Key | Type | Purpose |
|---|---|---|
| `FLY_API_TOKEN` | secret | Fly.io deployments |
| `DEV_API_BASE_URL` | secret | `VITE_API_BASE_URL` at build time |
| `DEV_CONTROL_PLANE_URL` | var | `VITE_CONTROL_PLANE_URL` at build time |
| `DEV_FLY_APP_NAME` | var | Fly.io app name |
| `CLOUDFLARE_DOMAIN` | var | Root domain for DNS |

## Design System

- **Framework**: Tailwind CSS 3.x with custom theme extension
- **Tokens**: Semantic color tokens mapped to HSL CSS variables (`bg-primary`, `text-muted-foreground`, `border-border`, etc.)
- **Palette**: Hixson-green primary (emerald-600) on clean white/slate backgrounds (light); deep slate with brighter emerald accent (dark)
- **Primitives**: shadcn/ui-style components in `src/components/ui/` — Card, Button, Badge, Tabs, Input, Dialog, Label, Alert. Styled via Tailwind utilities + `class-variance-authority` for variants
- **Icons**: lucide-react
- **No MUI**: Custom Tailwind primitives only; lighter bundle, full design control

## License

Private - Hixson AI internal platform

## Changelog
- 2026-04-23: UI/UX refresh — rebuilt Tailwind theme with semantic HSL tokens, polished all tenant and apps views, replaced inline styles with Tailwind utilities, tightened card/tab layouts, added quick stats row to TenantDetail.
- 2026-04-20: Added Builder Chat system (BuilderChat, ChatWidgets, 4 widget types), Action Library panel replacing static catalog, field validators with 27 types, unit tests (60 passing), Playwright e2e tests with mocked API. Renamed "step catalog" → "Action Library" throughout. Step config panel refactored to dialog.
- 2026-04-13: App Builder MVP with flow canvas, drag-drop, step config, data mapping, secrets panel, autosave, undo stack, validation, execution log.
