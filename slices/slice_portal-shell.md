# Slice: Portal Shell — Branded Loading, Routing Fix, Header Redesign

## Overview

Hardens the portal shell that wraps every page: a single branded loading
language, a routing/provider invariant that prevents the dashboard from getting
stuck on the spinner, and a redesigned header that makes the portal feel like a
real product.

**Repo**: `hixson-ai/lookout-portal`
**Goal**: Authenticated users always reach a usable page; loading states are
on-brand; the top chrome reads as a product, not a scaffold.
**Status**: ✅ Done (2026-04-28)

## Problems being solved

1. **Loading spinner that never resolved**. Hitting `/` while authenticated
   showed `<LukoutLoaderCentered />` forever. Root cause: `RootRedirect` called
   `useTenantContext()`, but `<TenantProvider>` was only mounted under
   `/:tenantSlug`. The default-context fallback returned
   `{ availableTenants: [], loading: false }`, so none of the navigation
   branches fired and the redirect component stayed on its loading screen.
2. **Generic `Loader2` spinners everywhere**. Every loading state used the
   lucide `Loader2` icon — no brand identity, inconsistent with the lukout
   mark.
3. **Header was a scaffold**. Plain text links, raw email string, single icon
   logout button. Did not communicate "this is the product".

## Implementation

### 1. `LukoutLoader` component family

`src/components/ui/lukout-loader.tsx` exports three components:

| Component | Use |
|---|---|
| `LukoutLoader` | Inline animated mark (default 32px). Brackets always visible; arms (top → mid → bot) fade in sequentially then out. |
| `LukoutLoaderCentered` | Full-screen centered loader with optional label. Drop-in for "Loading…" pages. |
| `LukoutSpinner` | Compact button/inline spinner. Replaces `<Loader2 className="h-4 w-4 animate-spin" />`. |

Animation lives in `src/index.css` as `@keyframes lk-arm-cycle` (opacity + slight
scaleX, 1.8s loop, 0s/0.2s/0.4s arm delays). Honors
`prefers-reduced-motion: reduce` (no animation, all arms shown statically).

`PageState` `variant="loading"` now renders the LukoutLoader, so any caller of
`<PageState variant="loading" />` gets the branded animation for free.

### 2. Routing/provider hoist

`src/App.tsx` now mounts `<TenantProvider>` once, around the entire
authenticated route tree:

```tsx
return (
  <Router>
    <CommandPaletteProvider>
      <Suspense fallback={<PageFallback />}>
        {user ? <TenantProvider>{routes}</TenantProvider> : routes}
      </Suspense>
      <Toaster />
    </CommandPaletteProvider>
  </Router>
);
```

- `RootRedirect`, `SelectTenant`, and `WorkspaceShell` all share the same
  tenant state.
- `TenantProvider` only mounts when `user` is set, so it never fires
  `api.getTenants()` on the login page.
- `RootRedirect` defensively routes the 0-tenant case to `/select-tenant`
  (which already has an empty-state UI) so a user with no tenants doesn't hang
  either.

### 3. Header redesign

`src/components/layout/Header.tsx` is now the brand surface:

- Brand block: lukout mark in a gradient tile + `lukout` wordmark + small
  `Portal` eyebrow.
- Primary nav uses `NavLink` with `isActive` states (System Admins see
  `All Tenants` + `Platform Admin`; tenant managers see `My Tenants`).
- Pill-shaped user menu: avatar (Google picture or initials), display name,
  chevron. Click opens a dropdown with full name, email, system-admin badge,
  and Sign out.
- Mobile drawer mirrors the same nav + identity card with a `Sign out` button.
- Outside-click and `Escape` close the dropdown; ARIA `aria-haspopup`,
  `aria-expanded` set correctly.

## Files changed

- `src/components/ui/lukout-loader.tsx` — new component file (also exports
  `LukoutSpinner`).
- `src/components/ui/page-state.tsx` — `loading` variant uses LukoutLoader.
- `src/index.css` — `@keyframes lk-arm-cycle` + reduced-motion guard.
- `src/App.tsx` — TenantProvider hoisted; suspense fallback uses
  LukoutLoaderCentered.
- `src/components/routing/RootRedirect.tsx` — uses LukoutLoaderCentered;
  empty-tenant case redirects to `/select-tenant`.
- `src/pages/SelectTenant.tsx`, `src/pages/workspace/WorkspaceShell.tsx` —
  full-screen loaders use LukoutLoaderCentered.
- `src/components/layout/Header.tsx` — full redesign.
- ~15 files (PlatformAdmin, AppBuilder, ExecutionTimeline, ExecutionStepTree,
  PlatformJobsTab, AppsTab, AiKeysTab, OverviewTab, UsageTab, BuilderChat,
  ChatWidgets, ConfigDrawer, ActionConfigPanel, WorkflowSettings,
  RequiredSecretsPanel, ActionCatalog) — `Loader2` → `LukoutSpinner`,
  text "Loading…" placeholders → `<PageState variant="loading" />`.

## Invariants going forward

- **Don't import `Loader2` in new code.** Use `LukoutSpinner` (inline /
  buttons) or `LukoutLoaderCentered` (full-page).
- **Don't mount `TenantProvider` deeper than `App.tsx`.** Any new authenticated
  route that touches tenant context relies on the top-level provider.
- **Pages without a meaningful empty/loading distinction** should use
  `PageState` rather than ad-hoc `text-center py-12 …` divs, so the branded
  loader propagates automatically.

## Architecture references

- `docs/09-repositories.md#lookout-portal` — UI shell invariants.
- Brand: `slides/THEME.md` (architecture repo) — lukout mark + emerald palette
  the loader animation is built around.

## Changelog
- 2026-04-28: Slice authored alongside the shipped change set.
