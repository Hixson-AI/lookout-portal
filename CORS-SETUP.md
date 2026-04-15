# CORS Configuration for Slice 4.1

## Required Manual Configuration

The portal requires CORS configuration to communicate with the control plane and API. You must add the portal domain to the `DEV_ALLOWED_ORIGINS` environment variable in both repositories.

## Portal Domain

```
https://portal.dev.client.cumberlandstrategygroup.com
```

## Steps

### 1. Update lookout-control

Go to `hixson-ai/lookout-control` repository settings → Secrets and variables → Actions → Variables

Edit `DEV_ALLOWED_ORIGINS` to include the portal domain:

```
https://control.dev.client.cumberlandstrategygroup.com,https://portal.dev.client.cumberlandstrategygroup.com
```

### 2. Update lookout-api

Go to `hixson-ai/lookout-api` repository settings → Secrets and variables → Actions → Variables

Edit `DEV_ALLOWED_ORIGINS` to include the portal domain:

```
https://api.dev.client.cumberlandstrategygroup.com,https://portal.dev.client.cumberlandstrategygroup.com
```

### 3. Redeploy both services

After updating the variables, redeploy both services to pick up the new CORS configuration:

```bash
# lookout-control
git push main  # Triggers dev-deploy workflow

# lookout-api
git push main  # Triggers dev-deploy workflow
```

## Verification

After deployment, verify CORS is working by:
1. Opening the portal at `https://portal.dev.client.cumberlandstrategygroup.com`
2. Logging in via Google OAuth
3. Checking browser network tab for successful API calls without CORS errors
