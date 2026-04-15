# Slice 4.1: Admin Portal MVP

## Overview

Build the Phase 1 Admin Portal MVP with Google OAuth authentication, tenant management UI, and Fly.io deployment. This slice provides Hixson staff with a web interface to manage tenants instead of using the CLI.

**Repo**: `hixson-ai/lookout-portal`
**Goal**: Hixson staff can log in via Google OAuth and manage tenants (list, view details, edit settings, manage API keys) through a web UI
**Timeline**: 3-4 days
**Status**: Ready to implement

## Success Criteria

- [ ] Hixson staff can log in via Google OAuth (hixson.ai domain restricted)
- [ ] View list of all tenants with search/filter
- [ ] Click tenant to view detail page
- [ ] Overview tab shows API keys (masked), endpoints, status
- [ ] Can create new API keys (shown once with copy button)
- [ ] Can revoke existing API keys with confirmation
- [ ] Settings tab allows editing tenant name, slug, status
- [ ] Deployed to Fly.io with custom domain
- [ ] DNS configured in Cloudflare
- [ ] CORS properly configured with control plane

## Dependencies

- **Control plane stable**: `lookout-control` API fully functional (auth, tenants, API keys endpoints)
- **Fly.io account**: Portal deployment infrastructure
- **Cloudflare**: DNS management for custom domain

## Environment Variables

**Build-time (VITE_ prefix)**:
- `VITE_CONTROL_PLANE_URL` — Control plane API base URL (e.g., `https://control.dev.client.cumberlandstrategygroup.com`)

**Runtime (Fly.io secrets)**:
- Same as build-time (static site)

## Implementation

### Core Features

**Authentication**:
- Google OAuth2 login via control plane `/auth/google` (authorization code flow)
- Control plane handles code exchange via `/auth/google/callback` endpoint
- JWT stored in localStorage (cross-domain OAuth pattern)
- Control plane is auth boundary — portal never validates Google tokens directly
- Platform JWT returned from control plane contains: id, email, name, picture, isSystemAdmin, tenants array

**Tenant Management**:
- Home page differentiates based on admin status (system admins see full dashboard, operators see their assigned tenants)
- Tenant list with search/filter (card grid pattern adapted from novomesa `PlatformClients.tsx`)
- Tenant detail with tabs: Overview | Settings
- Create new tenant (system admin only) — basic form (name, slug, tier)
- Edit tenant profile (name, slug, status)

**API Key Management**:
- List API keys with prefix, label, createdAt, lastUsedAt
- Create new API key (shows full key once, then masked)
- Copy API key to clipboard with show/hide toggle
- Revoke API key with confirmation dialog

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS + shadcn/ui (button, card, input, tabs, dialog, alert, badge, table)
- **State**: React Query (@tanstack/react-query) for API state management
- **Auth**: Custom OAuth2 flow via control plane
- **Icons**: lucide-react

### Project Structure

```
lookout-portal/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── TenantList.tsx
│   │   └── TenantDetail.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   └── GoogleAuthButton.tsx
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   └── Header.tsx
│   │   └── tenants/
│   │       ├── TenantCard.tsx
│   │       ├── TenantForm.tsx
│   │       ├── ApiKeyList.tsx
│   │       ├── ApiKeyCreateDialog.tsx
│   │       ├── OverviewTab.tsx
│   │       └── SettingsTab.tsx
│   ├── lib/
│   │   ├── api.ts              # Control plane client with JWT auth
│   │   ├── auth.ts             # OAuth2 flow + JWT storage
│   │   └── utils.ts            # Helpers (formatDate, etc.)
│   └── hooks/
│       ├── useAuth.ts          # Auth state + login/logout
│       ├── useTenants.ts       # React Query for tenants
│       └── useTenant.ts        # Single tenant query
├── .github/workflows/
│   └── deploy.yml              # Fly.io deployment
├── fly.toml                    # Fly.io config
├── Dockerfile                  # Multi-stage (dev + production static)
└── [existing config files]
```

### API Integration

**Control plane client** (`src/lib/api.ts`):
- Base URL from `VITE_CONTROL_PLANE_URL`
- JWT from localStorage added to Authorization header
- Endpoints:
  - `POST /auth/google` — Exchange Google ID token for platform JWT
  - `GET /v1/tenants` — List all tenants (system admin)
  - `GET /v1/tenants/:id` — Get tenant details
  - `POST /v1/tenants` — Create tenant (system admin)
  - `PATCH /v1/tenants/:id` — Update tenant
  - `GET /v1/tenants/:id/api-keys` — List API keys
  - `POST /v1/tenants/:id/api-keys` — Create API key
  - `DELETE /v1/tenants/:id/api-keys/:keyId` — Revoke API key

**React Query hooks** (`src/hooks/`):
- `useAuth()` — Login, logout, auth state
- `useTenants()` — Fetch tenants with search/filter
- `useTenant(id)` — Fetch single tenant
- `useApiKeys(tenantId)` — Fetch API keys for tenant

### UI Patterns from Novomesa to Adapt

**Tenant List** (`PlatformClients.tsx` pattern):
- Responsive card grid (2 columns on md, 3 on lg)
- Hover effect with shadow elevation
- Status badge (active/suspended)
- User count display
- Search bar for filtering
- "Create Tenant" button (system admin only)

**Tenant Detail** (`Settings.tsx` pattern):
- Tabbed interface using shadcn/ui Tabs
- Breadcrumb navigation back to list
- Overview tab: API keys, endpoints, status
- Settings tab: Form with validation

**Forms** (`ClientSettingsTab.tsx` pattern):
- Real-time validation with debounced checks
- Confirmation dialogs for destructive actions
- Inline error/success alerts
- Save/Cancel actions

### Deployment

**Fly.io Configuration** (`fly.toml`):
```toml
app = "lookout-portal-dev"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[deploy]
  strategy = "rolling"
```

**Dockerfile** (update existing):
- Production stage serves static files from `dist/` using `serve`
- Build stage runs `pnpm build`

**GitHub Workflow** (update `.github/workflows/deploy.yml`):
- Use `superfly/flyctl-actions/setup-flyctl`
- Build with `pnpm build`
- Deploy with `flyctl deploy --app lookout-portal-dev`
- Set secrets via `flyctl secrets import`

**DNS Configuration** (add to `lookout-api/config/dns-dev.yaml`):
```yaml
portal:
  dev:
    domain: "portal.dev.client.${CLOUDFLARE_DOMAIN}"
    type: "CNAME"
    target: "${FLY_HOSTNAME}"
    status: "active"
    ssl: true
    proxy: false
    description: "Admin portal for dev environment"
```

### CORS Configuration

Add portal domain to GitHub repository variables:
- `lookout-control` — Add to `DEV_ALLOWED_ORIGINS`
- `lookout-api` — Add to `DEV_ALLOWED_ORIGINS`

Format: `https://portal.dev.client.cumberlandstrategygroup.com`

### Security Considerations

**JWT Storage**:
- localStorage for MVP (cross-domain OAuth pattern)
- Short TTL (15-30 minutes) configured in control plane
- Refresh token rotation
- HTTPS only
- Content Security Policy to mitigate XSS

**Authentication Flow**:
- State parameter in OAuth redirect to prevent CSRF
- Validate JWT signature and expiration on every request

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Testing Strategy

**Manual testing**:
- Google OAuth flow works end-to-end
- Admin can view and manage tenants
- API key copy button works
- Custom domain routing works

**No automated tests** for MVP — focus on getting the portal working first.

## Architecture References

- **Auth**: `lookout-control/src/routes/auth.ts` — POST /auth/google returns platform JWT
- **Tenants**: `lookout-control/src/routes/tenants.ts` — Full CRUD + operator management
- **API Keys**: `lookout-control/src/routes/api-keys.ts` — Generate, list, revoke
- **Novomesa Patterns**:
  - `src/frontend/src/pages/platform/PlatformClients.tsx` — Card grid tenant list
  - `src/frontend/src/components/admin/ClientSettingsTab.tsx` — Form patterns with validation
  - `src/frontend/src/pages/admin/Settings.tsx` — Tabbed interface structure
- **Deployment**: `lookout-control/fly.toml` — Fly.io configuration pattern

## Next Slice

**Slice 4.2**: Rich Features — See `slices/slice_4.2.md`

Add advanced features: theming system (colors, dark mode), SSO configuration UI, advanced DataTable with sorting/pagination, dual-context subdomain routing (client portal), and observability integration with Grafana.

## Deferred to Future Slices

- **Slice 4.2**: Per-tenant theming, SSO configuration, advanced tables, dual-context routing
- **Slice 4.3**: Client portal experience (tenant users view their own tenant, embedded Grafana dashboards)
