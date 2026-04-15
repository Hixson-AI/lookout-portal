# Slice 8: Portal Basic Dashboard

## Overview

Build the initial operator dashboard in `lookout-portal`. A React SPA that consumes the control plane API to manage tenants, view observability, and monitor platform health.

**Repo**: `hixson-ai/lookout-portal`
**Goal**: Operators can create tenants and view dashboard without CLI
**Timeline**: 4-5 days
**Success Criteria**:
- Google OAuth2 authentication
- Tenant list, creation, and monitoring views
- Client-scoped observability integration
- Deployed to Railway

## Dependencies

- **Control plane stable**: `lookout-control` API fully functional
- **Observability setup**: Grafana with client-scoped views
- **Railway account**: Internal tool hosting

## Environment Variables

**Required**:
- `VITE_CONTROL_PLANE_URL` — Control plane API base URL
- `VITE_GRAFANA_URL` — Grafana dashboard URL
- `GOOGLE_CLIENT_ID` — OAuth2 client ID (hixson.ai domain)

**Build-time**: Vite exposes env vars prefixed with `VITE_`

## Implementation

### Core Features

**Authentication**:
- Google OAuth2 login (hixson.ai domain)
- Session management with refresh tokens

**Tenant Management**:
- List tenants with filtering (profile, status)
- Create new tenants via form
- View tenant details and configuration
- Monitor drift status

**Observability Integration**:
- Embedded Grafana panels per client
- Client-scoped views from shared Loki/Grafana
- Alert notifications

### Tech Stack

- **Frontend**: React + TypeScript
- **Routing**: React Router
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query for API state
- **Auth**: Custom OAuth2 flow
- **Build**: Vite

### Project Structure

```
lookout-portal/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── tenants/
│   │   └── observability/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useTenants.ts
│   ├── lib/
│   │   ├── api.ts               # Control plane client
│   │   └── auth.ts              # OAuth2 client
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Tenants.tsx
│   │   └── Dashboard.tsx
│   └── App.tsx
├── public/
├── .github/workflows/
│   └── deploy.yml               # Railway deployment
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

### API Integration

**Control plane client**:
- REST API calls with authentication
- Error handling and loading states
- React Query for caching

**Grafana embedding**:
- Iframe or API integration
- Client-specific dashboard URLs

### Testing Strategy

- **Unit tests**: Components, hooks
- **Integration tests**: API calls, auth flow
- **E2E tests**: Full user journeys

### Local Development

```bash
# Install
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

### Deployment Considerations

- **Railway**: Static site hosting
- **Environment**: Internal-only, no PHI exposure
- **Auth**: Google OAuth2 for hixson.ai operators
- **CORS**: Configure control plane for portal origin

### GitHub Actions Deploy Workflow (Railway)

Add auto-deploy to Railway on every push to `main`.

**Prerequisites**:
- Railway account and project created
- Railway service named `lookout-portal`
- GitHub secret: `RAILWAY_TOKEN` (get from Railway dashboard → Project Settings → Tokens)

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      
      - name: Build
        run: pnpm build
        env:
          VITE_CONTROL_PLANE_URL: ${{ secrets.VITE_CONTROL_PLANE_URL }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service=lookout-portal
      
      - name: Verify deployment
        run: |
          # Wait a moment for deployment to start
          sleep 10
          # Get the URL from Railway and check health
          RAILWAY_URL=$(railway status --service=lookout-portal --json | jq -r '.url')
          curl -sf "${RAILWAY_URL}/healthz" || echo "⚠️ Health check failed, but deploy may still be in progress"
```

**Testing**:
```bash
git add .github/workflows/deploy.yml
git commit -m "Add Railway auto-deploy workflow"
git push origin main
```

**Railway CLI Setup** (for local testing):
```bash
npm install -g @railway/cli
railway login  # Opens browser
railway link   # Select lookout-portal project
railway up     # Manual deploy (same as CI)
```

## Architecture References

- `docs/06-tool-role-mapping.md#core-tools` — Vite + React SPA role
- `docs/08-control-plane.md#operator-cli` — Portal as GUI alternative
- `docs/03-strategy-spine.md#observability` — Client-scoped views

## Next Steps After Slice 8

1. ✅ **Railway auto-deploy configured** — Push to `main` triggers Railway deploy
2. Configure OAuth2 for portal (Google Cloud Console)
3. Build core tenant management UI
4. Integrate observability views
5. Train operators on portal usage
