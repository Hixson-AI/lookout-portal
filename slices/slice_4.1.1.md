# Slice 4.1.1: Local Development Setup

## Objective
Get lookout-portal, lookout-control, and lookout-api running locally with no external dependencies beyond Google OAuth client ID/secrets.

## Requirements
- Run lookout-portal React app locally using Vite dev server
- Run lookout-control locally (auth service)
- Run lookout-api locally (API service)
- Configure Google OAuth for local development
- Use local PostgreSQL databases for control and API
- No external service dependencies (Fly.io, Cloudflare, etc.)

## Tasks
1. Set up local environment variables for all three services
2. Configure Vite dev server for local development
3. Set up local PostgreSQL databases for control and API
4. Set up Google OAuth client ID/secrets for localhost
5. Document local development workflow for all services
6. Ensure all API calls work between services locally
7. Create docker-compose for local development (optional)
