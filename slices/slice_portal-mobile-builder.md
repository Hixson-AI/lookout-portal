# Slice: AppBuilder Mobile Strategy (Deferred)

## Overview

Decide and implement how the `AppBuilder` workflow canvas (React Flow v12 + Action Library rail + Config Drawer + AI Builder chat + Data Mapping panel) should behave on phone-sized viewports.

**Repo**: `hixson-ai/lookout-portal`
**Status**: 🟡 Deferred — captured as a follow-up after `slice_portal-mobile`.

## Why Deferred

The general portal mobile pass (`slice_portal-mobile`) covers tenant management, dashboards, secrets, and admin views. The builder is a fundamentally different UX problem: a node-based visual canvas with drag-and-drop, multi-pane layout, and dense forms. Making it phone-friendly is a design decision, not a CSS sweep.

## Options to Evaluate

1. **View-only on mobile** *(recommended default)*
   - Allow read-only inspection of workflow nodes on phones.
   - Disable drag-and-drop, hide left rail and config drawer.
   - Show a "Best edited on a tablet or desktop" CTA at top.
   - Keep full editor experience at `md:` (≥768px) and up.
   - Lowest risk, fastest to implement.

2. **Full editor everywhere**
   - Convert left Action Library rail and right Config Drawer into bottom sheets / modals on phone.
   - Use touch-friendly DnD (`react-dnd-touch-backend` or pointer-events shim).
   - Replace `grid-cols-2/3/4` config layouts with stacked single-column on phone.
   - Highest user value, highest complexity.

3. **Hide on mobile**
   - Redirect `/builder` and `/{tenant}/apps/:id/edit` on phone with a "Switch to desktop" notice.
   - Keep all other portal pages mobile-friendly (already done in the prior slice).
   - Simplest, but blocks emergency edits from a phone.

## Decision Criteria

- How often do operators actually open the builder from a phone? (Add analytics first?)
- Are there urgent edit scenarios (toggling a step, fixing a credential) that justify option 2?
- Is the desktop UX strong enough that option 1 covers 90% of phone use cases?

## Affected Components

- `src/pages/AppBuilder.tsx` (top bar wraps, fixed AI builder panel `w-96`).
- `src/components/workflow/FlowCanvas.tsx` (React Flow viewport).
- `src/components/workflow/ActionLibraryPanel.tsx` (left rail, hidden `<md`).
- `src/components/workflow/ActionConfigPanel.tsx` (`grid-cols-4`, `grid-cols-2`).
- `src/components/workflow/DataMappingPanel.tsx` (`grid-cols-2`).
- `src/components/workflow/BuilderChat.tsx`, `ChatWidgets.tsx`.
- `src/components/workflow/ConfigDrawer.tsx`, `RunPanelDialog.tsx`, `WorkflowSettings.tsx`.

## Out of Scope (for this deferred slice)

- Any changes to the non-builder portal pages — those land in `slice_portal-mobile`.
- Backend, API, or workflow-execution changes.

## Next Step

When prioritized, run `/speckit.specify` against this doc to choose between the three options and produce a concrete plan + tasks list.
