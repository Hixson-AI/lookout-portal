# Slice 4.2: Rich Features

## Overview

Add advanced features to the portal: per-tenant theming system, SSO configuration UI, advanced DataTable with sorting/pagination, dual-context subdomain routing for client portal experience, and observability integration with Grafana.

**Repo**: `hixson-ai/lookout-portal`
**Goal**: Enhanced portal with theming, SSO management, advanced data tables, client portal routing, and observability dashboards
**Timeline**: 5-6 days
**Status**: Ready to implement after Slice 4.1

## Success Criteria

- [ ] Per-tenant theming system (primary/secondary colors, dark mode, real-time preview)
- [ ] SSO configuration UI (provider cards, wizard, test integration)
- [ ] Advanced DataTable with sorting, pagination, search, bulk actions
- [ ] Dual-context subdomain routing (admin.portal.dev... vs tenant.portal.dev...)
- [ ] Observability tab with embedded Grafana dashboards
- [ ] Client portal dashboard for tenant users
- [ ] User management within tenants (admin role)

## Dependencies

- **Slice 4.1 complete**: Admin Portal MVP fully functional
- **Control plane**: SSO configuration endpoints (future work)
- **Grafana**: Dashboards configured with tenant-scoped views
- **Novomesa reference**: Theming and SSO patterns available

## Environment Variables

**Build-time (VITE_ prefix)**:
- `VITE_CONTROL_PLANE_URL` — Control plane API base URL
- `VITE_GRAFANA_URL` — Grafana dashboard URL
- `VITE_ADMIN_SUBDOMAIN` — Admin subdomain (default: `admin`)

**Runtime (Fly.io secrets)**:
- Same as build-time (static site)

## Implementation

### Core Features

#### 1. Per-Tenant Theming System

**Adapted from novomesa**:
- CSS variable-based theming with TailwindCSS
- Primary/secondary/accent colors
- Light/dark/auto mode support
- Real-time preview with debounced save
- Logo upload support

**Components**:
- `src/components/tenants/BrandingTab.tsx` — Color picker, logo upload
- `src/lib/theme.ts` — Theme provider with CSS variable injection
- `src/hooks/useTheme.ts` — Theme state management

**Data Model** (control plane future work):
```typescript
interface BrandingSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  logoUrl?: string
  themeMode: 'light' | 'dark' | 'auto'
}
```

**Pattern from novomesa**:
- `src/frontend/src/theme.ts` — MUI theme creation (adapt to Tailwind CSS variables)
- `src/frontend/src/components/providers/EnhancedClientProvider.tsx` — Theme context
- `src/frontend/src/components/admin/BrandingTab.tsx` — Color picker with real-time preview

#### 2. SSO Configuration UI

**Adapted from novomesa**:
- Provider cards (Google, Azure AD, Okta, Auth0, SAML)
- Configuration wizard with step-by-step setup
- Test configuration endpoint
- Enable/disable provider
- Delete configuration

**Components**:
- `src/components/tenants/SSOTab.tsx` — Main SSO configuration tab
- `src/components/tenants/sso/ProviderCards.tsx` — Provider status cards
- `src/components/tenants/sso/SSOWizard.tsx` — Configuration wizard
- `src/components/tenants/sso/useSSOMgmt.ts` — SSO management hook

**Pattern from novomesa**:
- `src/frontend/src/pages/admin/SSOConfiguration.tsx` — Full SSO config UI
- `src/frontend/src/components/admin/SSOTab.tsx` — Tab component
- `src/frontend/src/components/admin/sso/` — Provider cards and wizard

**Note**: Control plane SSO endpoints are future work — UI can be stubbed for now.

#### 3. Advanced DataTable

**Adapted from novomesa**:
- Reusable DataTable component with:
  - Sorting (column headers)
  - Pagination (page size selector)
  - Search/filter
  - Row selection (checkboxes)
  - Bulk actions menu
  - Export functionality
  - Custom cell formatters (date, status, currency)

**Components**:
- `src/components/common/DataTable.tsx` — Reusable table component
- Replace card grid in TenantList with DataTable

**Pattern from novomesa**:
- `src/frontend/src/components/common/DataTable.tsx` — Full-featured table

#### 4. Dual-Context Subdomain Routing

**Adapted from novomesa**:
- Subdomain detection utilities
- Admin subdomain: `admin.portal.dev.client.cumberlandstrategygroup.com`
- Tenant subdomain: `{tenant-slug}.portal.dev.client.cumberlandstrategygroup.com`

**Components**:
- `src/lib/subdomain.ts` — Subdomain detection utilities
- `src/components/layout/Layout.tsx` — Context-aware layout
- `src/pages/client/Dashboard.tsx` — Client portal dashboard

**Pattern from novomesa**:
- `src/frontend/src/lib/subdomain.ts` — Subdomain detection

**Routing Logic**:
```typescript
// Admin subdomain → Admin portal (all tenants)
if (subdomain === 'admin') {
  return <AdminPortal />
}

// Tenant subdomain → Client portal (single tenant)
if (subdomain) {
  const tenant = await getTenantBySlug(subdomain)
  return <ClientPortal tenant={tenant} />
}

// Default → Admin portal
return <AdminPortal />
```

#### 5. Observability Integration

**Components**:
- `src/components/tenants/ObservabilityTab.tsx` — Grafana dashboard embedding
- Iframe with tenant-scoped Grafana dashboards
- Dashboard selector (executive, operational, analytical)

**Grafana Integration**:
- Embed Grafana dashboards via iframe
- Pass tenant ID as query parameter for scoping
- Authentication via Grafana anonymous access or token

#### 6. Client Portal Dashboard

**Components**:
- `src/pages/client/Dashboard.tsx` — Client-facing dashboard
- `src/pages/client/Settings.tsx` — Client settings view
- API key display (masked, copy button)
- Tenant profile information
- Embedded Grafana dashboards

**Features**:
- View API configuration
- Copy API key
- View usage metrics
- Access observability dashboards
- Basic tenant settings (name, logo)

**Authentication**:
- Google OAuth via control plane
- JWT contains tenant context
- Only shows data for their tenant

#### 7. User Management

**Components**:
- `src/components/tenants/UsersTab.tsx` — User management tab
- List operators with roles
- Add/remove operators
- Role assignment (admin, operator, viewer)

**API Integration**:
- `GET /v1/tenants/:id/operators` — List operators
- `POST /v1/tenants/:id/operators` — Add operator
- `DELETE /v1/tenants/:id/operators/:operatorId` — Remove operator

### Tech Stack Additions

- **Theming**: CSS variables + TailwindCSS
- **Icons**: lucide-react (already in 4.1)
- **Forms**: shadcn/ui components (already in 4.1)

### Project Structure (Additions)

```
lookout-portal/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── DataTable.tsx           # Advanced table component
│   │   ├── tenants/
│   │   │   ├── BrandingTab.tsx        # NEW: Theming configuration
│   │   │   ├── SSOTab.tsx             # NEW: SSO configuration
│   │   │   ├── ObservabilityTab.tsx   # NEW: Grafana integration
│   │   │   ├── UsersTab.tsx           # NEW: User management
│   │   │   └── sso/                   # NEW: SSO sub-components
│   │   │       ├── ProviderCards.tsx
│   │   │       ├── SSOWizard.tsx
│   │   │       └── useSSOMgmt.ts
│   │   └── layout/
│   │       └── Layout.tsx             # UPDATED: Context-aware
│   ├── lib/
│   │   ├── theme.ts                   # NEW: Theme provider
│   │   └── subdomain.ts               # NEW: Subdomain detection
│   ├── pages/
│   │   ├── tenant-detail/
│   │   │   └── Tabs.tsx               # UPDATED: Add Observability, Users tabs
│   │   └── client/                    # NEW: Client portal pages
│   │       ├── Dashboard.tsx
│   │       └── Settings.tsx
│   └── hooks/
│       └── useTheme.ts                # NEW: Theme hook
└── [existing structure]
```

### UI Patterns from Novomesa

**Theming**:
- `src/frontend/src/theme.ts` — Theme creation function
- `src/frontend/src/components/providers/EnhancedClientProvider.tsx` — Theme context
- `src/frontend/src/components/admin/BrandingTab.tsx` — Color picker with debounced save

**SSO Configuration**:
- `src/frontend/src/pages/admin/SSOConfiguration.tsx` — Full SSO UI
- `src/frontend/src/components/admin/SSOTab.tsx` — Tab component
- `src/frontend/src/components/admin/sso/` — Provider cards and wizard

**DataTable**:
- `src/frontend/src/components/common/DataTable.tsx` — Full-featured reusable table

**Subdomain Routing**:
- `src/frontend/src/lib/subdomain.ts` — Subdomain detection utilities

### Deployment

No deployment changes — Fly.io configuration from Slice 4.1 remains.

**DNS Updates** (add to `lookout-api/config/dns-dev.yaml`):
```yaml
portal-admin:
  dev:
    domain: "admin.portal.dev.client.${CLOUDFLARE_DOMAIN}"
    type: "CNAME"
    target: "${FLY_HOSTNAME}"
    status: "active"
    ssl: true
    proxy: false
    description: "Admin portal for dev environment"

portal-wildcard:
  dev:
    domain: "*.portal.dev.client.${CLOUDFLARE_DOMAIN}"
    type: "CNAME"
    target: "${FLY_HOSTNAME}"
    ssl: true
    proxy: false
    description: "Wildcard for client portal subdomains"
```

### Local Development

Same as Slice 4.1:
```bash
pnpm install
pnpm dev
```

For subdomain testing locally, use `/etc/hosts` or a local DNS tool.

### Testing Strategy

**Manual testing**:
- Theming: Change colors, verify preview, check dark mode
- SSO: Test wizard flow (stubbed endpoints)
- DataTable: Sort, paginate, search, bulk select
- Subdomain routing: Test admin vs tenant subdomain access
- Observability: Verify Grafana dashboards load with tenant context
- Client portal: Log in as tenant user, verify scoped access

**No automated tests** — Manual testing focus.

## Architecture References

- **Novomesa Theming**:
  - `src/frontend/src/theme.ts` — Theme creation
  - `src/frontend/src/components/providers/EnhancedClientProvider.tsx` — Theme context
  - `src/frontend/src/components/admin/BrandingTab.tsx` — Color picker
- **Novomesa SSO**:
  - `src/frontend/src/pages/admin/SSOConfiguration.tsx` — Full UI
  - `src/frontend/src/components/admin/SSOTab.tsx` — Tab component
  - `src/frontend/src/components/admin/sso/` — Sub-components
- **Novomesa DataTable**:
  - `src/frontend/src/components/common/DataTable.tsx` — Reusable table
- **Novomesa Subdomain**:
  - `src/frontend/src/lib/subdomain.ts` — Subdomain detection
- **Control Plane**:
  - `lookout-control/src/routes/tenants.ts` — Operator management endpoints
- **Grafana**: Tenant-scoped dashboards (future work)

## Next Slice

**Slice 4.3**: Client Portal Deep Dive — Future work

Additional client portal features: advanced user management, audit log viewer, notification preferences, custom role definitions.

## Deferred to Future

- **Control plane SSO endpoints**: Backend support for SSO configuration
- **Grafana tenant scoping**: Dashboard configuration per tenant
- **Audit logging**: Portal activity tracking
- **Notification system**: Email/in-app notifications
