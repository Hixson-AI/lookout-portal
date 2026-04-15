# PROMPT: Bootstrap Lookout Portal

Bootstrap the `lookout-portal` repository with Slice 8: basic operator dashboard.

## Goal

Create a React SPA that consumes the control plane API for tenant management.

## Tech Stack

- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query
- **Routing**: React Router
- **Auth**: Google OAuth2
- **Package Manager**: pnpm

## Deliverables

1. **Project Structure**:
```
lookout-portal/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── tenants/
│   │   └── layout/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useTenants.ts
│   ├── lib/
│   │   └── api.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Tenants.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .github/workflows/
│   └── deploy.yml
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
├── tsconfig.json
└── README.md
```

2. **Features**:
- Google OAuth2 login (hixson.ai domain)
- Tenant list view
- Basic tenant creation form
- Dashboard layout

3. **Pages**:
- `/login` — Authentication
- `/tenants` — Tenant management
- `/dashboard` — Overview

## Code Rules

- Functional components with hooks
- TypeScript strict mode
- React Query for server state
- Tailwind for styling

## Environment Variables

```
VITE_CONTROL_PLANE_URL=
VITE_GRAFANA_URL=
VITE_GOOGLE_CLIENT_ID=
```

## Local Dev

```bash
pnpm install
pnpm dev
pnpm build
```

## Success Criteria

- Vite dev server starts
- Login page renders
- Can list tenants (mock data OK for bootstrap)
- Builds successfully

## Architecture Reference

See `architecture/implementation/planning/lookout-portal/slice-8.md`

---

**Status**: Deferred until control plane API is stable.
