# Slice: Portal Mobile-Friendly Pass

## Overview

Make every page in the Lookout admin portal usable on phones (≥360px) and tablets (768–1024px) without horizontal scroll, with readable typography and tap-friendly controls.

**Repo**: `hixson-ai/lookout-portal`
**Status**: ✅ Implemented (2026-04-28)

## Scope

Mobile-first responsive treatment for all non-builder pages: tenant list/detail/secrets/usage/AI keys, app dashboard, apps dashboard, action catalog, platform admin, secrets management, login, home.

The `AppBuilder` workflow canvas (React Flow) is **out of scope** — see `slice_portal-mobile-builder.md`.

## Success Criteria

- [x] Body has `overflow-x: hidden` safety net.
- [x] `Layout` vertical padding scales (`py-4 sm:py-6 lg:py-8`).
- [x] `useIsMobile` hook available for any JS-side responsive logic.
- [x] Multi-column grids are mobile-first (`grid-cols-1 sm:grid-cols-…`) where the source content is text-heavy.
  - `TenantSecrets`, `RequiredSecretsPanel` summary grids stack on phone.
  - `AppDashboard` stat cards become 2×2 on phone.
  - `ExecutionDetailDrawer` quick-stats grid becomes 2×2 on phone.
- [x] Tables wrap in `overflow-auto` and hide non-essential columns on phone.
  - `ApiKeyList`: prefix/created/last-used columns collapse into the label cell on `<sm`/`<md`.
- [x] Dialogs respect viewport height (`max-h-[90dvh] overflow-y-auto`) and lighter padding on phone.
- [x] Hero/page headings drop one type-step on phone (`text-2xl sm:text-3xl`).
- [x] `PlatformAdmin` tab strip scrolls horizontally on phone instead of forcing layout-wider.
- [x] Headers/toolbars wrap (`flex-wrap`, gap utilities) instead of overlapping.

## Files Changed

- `src/index.css` — body `overflow-x: hidden`.
- `src/components/layout/Layout.tsx` — responsive vertical padding.
- `src/hooks/useIsMobile.ts` — new SSR-safe `matchMedia` hook.
- `src/components/ui/dialog.tsx` — `max-h-[90dvh]` + responsive padding.
- `src/components/platform/ExecutionDetailDrawer.tsx` — wrap header, 2-up stat grid on phone.
- `src/components/secrets/RequiredSecretsPanel.tsx` — stack configured-secrets list.
- `src/components/tenants/ApiKeyList.tsx` — responsive column hiding.
- `src/pages/AppDashboard.tsx` — heading, padding, stat grid, header wrap.
- `src/pages/SecretManagement.tsx` — heading, padding, secret-row wrap.
- `src/pages/TenantSecrets.tsx` — summary grid stack.
- `src/pages/PlatformAdmin.tsx` — heading, scrollable tab strip.
- `src/pages/Home.tsx`, `src/pages/ActionCatalog.tsx` — heading scale + padding.
- `e2e/mobile-smoke.spec.ts` — Playwright smoke spec at iPhone-SE width asserting no horizontal overflow on key routes.

## Verification

- Manual: Chrome DevTools at 375×667 (iPhone SE), 412×915 (Pixel 7), 768×1024 (iPad mini).
- Automated: `pnpm exec playwright test e2e/mobile-smoke.spec.ts`.
- Build: `pnpm build` clean; existing vitest suite unchanged.

## Out of Scope

- AppBuilder canvas, action library rail, config drawer, data-mapping panel.
- Visual/brand refresh, dark-mode tuning.
- Backend or API changes.
