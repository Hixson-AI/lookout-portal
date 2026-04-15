# Slice 4.1.1: Local Development Setup

## Status: ✅ Complete

## Objective
Get lookout-portal, lookout-control, and lookout-api running locally with no external dependencies beyond Google OAuth client ID/secrets.

## Requirements
- Run lookout-portal React app locally using Vite dev server on port 7333
- Run lookout-control locally (auth service) on port 9443
- Run lookout-api locally (API service) on port 9444
- Configure Google OAuth for local development
- Use local PostgreSQL databases for control and API
- No external service dependencies (Fly.io, Cloudflare, etc.)

## Implementation

### Tasks Completed

1. ✅ Set up local environment variables for all three services
   - Created `lookout-portal/.env.example` with VITE_CONTROL_PLANE_URL and VITE_API_BASE_URL
   - Updated `lookout-control/.env.example` with local PostgreSQL and PORT=9443
   - Created `lookout-api/.env.example` with local PostgreSQL and PORT=9444

2. ✅ Configure Vite dev server for local development on port 7333
   - Updated `lookout-portal/vite.config.ts` to use port 7333

3. ✅ Set up local PostgreSQL databases for control and API
   - Created `docker-compose.local.yml` with two PostgreSQL instances
   - Control DB: localhost:5432 (user: lookout, db: control_plane)
   - API DB: localhost:5433 (user: postgres, db: lookout_api)

4. ✅ Set up Google OAuth client ID/secrets for localhost
   - Documented in LOCAL_DEVELOPMENT.md with setup instructions

5. ✅ Document local development workflow for all services
   - Created comprehensive `LOCAL_DEVELOPMENT.md` guide
   - Includes quick start, troubleshooting, and architecture diagram

6. ✅ Ensure all API calls work between services locally
   - Configured ALLOWED_ORIGINS to include localhost:7333
   - Control plane configured for port 9443
   - API configured for port 9444

7. ✅ Create docker-compose for local development
   - Created `docker-compose.local.yml` with health checks and persistent volumes

## Files Created/Modified

### Created
- `lookout-portal/.env.example`
- `lookout-api/.env.example`
- `docker-compose.local.yml`
- `LOCAL_DEVELOPMENT.md`

### Modified
- `lookout-portal/vite.config.ts` (port 3000 → 7333)
- `lookout-control/.env.example` (rewritten for local dev)

## Usage

See `LOCAL_DEVELOPMENT.md` for complete instructions.

Quick start:
```bash
# Start databases
docker-compose -f docker-compose.local.yml up -d

# Set up environment files (copy .env.example to .env and fill in values)
cd lookout-control && cp .env.example .env
cd ../lookout-api && cp .env.example .env
cd ../lookout-portal && cp .env.example .env

# Run migrations
cd lookout-control && pnpm migrate:local
cd ../lookout-api && pnpm migrate:local

# Start services (3 terminals)
cd lookout-control && pnpm dev  # port 9443
cd lookout-api && pnpm dev      # port 9444
cd lookout-portal && pnpm dev   # port 7333
```

## Next Steps

- Slice 4.1.2: CORS Configuration (if needed)
- Slice 4.2: Rich Features
