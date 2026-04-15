# Slice 0: Bootstrap + IaaS Automation

## Overview

Initial repository setup, project structure, and infrastructure automation foundation. This slice creates both the code foundation and the IaaS automation pipeline using GitHub Actions + gcloud CLI.

**Goal**: Repository initialized with IaaS automation via GH Actions + GCP creator credentials
**Status**: Repository complete, IaaS automation in progress

## What Was Done — Repository Bootstrap

- Repository initialized with Git
- README.md created with project overview
- PROMPT.md created with bootstrap instructions
- .gitignore configured for React/Vite
- slices/ folder created for build slice documentation

## IaaS Automation Foundation

GitHub Actions workflows that use GCP creator credentials to provision infrastructure:

- **GCP Service Account**: Creator credentials stored as GitHub secrets (`GCP_SA_KEY`)
- **gcloud CLI**: Commands in workflows (where applicable for Portal infrastructure)
- **Infrastructure as Code**: No manual console clicks — everything via YAML workflows

## Project Structure After Bootstrap

```
lookout-portal/
├── README.md
├── PROMPT.md
├── .gitignore
└── slices/
    ├── slice_0.md (this file)
    └── slice_8.md
```

## Next Slice

**Slice 8**: Basic Dashboard — See `slices/slice_8.md`

Build React SPA with tenant management UI, Google OAuth2, and Grafana integration.

**Status**: Deferred until control plane API is stable

## Architecture Reference

- `docs/06-tool-role-mapping.md` — Vite + React SPA role
- `docs/09-repositories.md` — Repository strategy
