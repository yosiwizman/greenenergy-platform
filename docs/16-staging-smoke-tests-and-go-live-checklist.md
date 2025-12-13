# Phase 3 Sprint 8: Staging Smoke Tests & Go-Live Checklist

**Status**: ✅ COMPLETED  
**Completion Date**: 2025-12-11

---

## Overview

This document provides a **complete checklist and operational guide** for deploying the Green Energy Platform to staging and production environments. It covers:

1. **Prerequisites**: Accounts and credentials needed
2. **Environment Variables**: Complete setup for all services
3. **Step-by-Step Deployment**: Railway + Vercel deployment flow
4. **Smoke Tests**: Automated health checks via `pnpm smoke:staging`
5. **Troubleshooting**: Common issues and solutions
6. **Manual Verification**: Final UI checks before going live

This sprint focuses on **operational readiness** — ensuring that staging/production deployment is safe, repeatable, and validated through automated smoke tests.

---

## 1. Purpose & Goals

### Why Smoke Tests?

After deploying to Railway and Vercel, you need confidence that:

- The Core API is running and can connect to the database
- Internal-protected endpoints are accessible with the correct API key
- Both Next.js frontends (customer portal + internal dashboard) are live
- Key pages load without errors
- Integration points are working

**Smoke tests provide fast, automated validation** of these critical paths without requiring extensive manual clicking.

### What This Sprint Does NOT Cover

- Load testing or performance benchmarking
- Full end-to-end integration tests (those belong in the test suite)
- Security audits or penetration testing
- Production monitoring/alerting setup (covered in future phases)

---

## 2. Prerequisites & Accounts

Before you begin deployment, ensure you have:

### 2.1 Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| **Railway** | Core API + PostgreSQL hosting | [railway.app](https://railway.app) |
| **Vercel** | Customer portal + Internal dashboard hosting | [vercel.com](https://vercel.com) |
| **GitHub** | Code repository (already set up) | N/A |
| **JobNimbus** | External API integration | Your existing account |
| **QuickBooks** | Accounting integration (optional for staging) | [developer.intuit.com](https://developer.intuit.com) |

### 2.2 Credentials to Gather

Before deployment, prepare these values:

- [ ] **JobNimbus API Key** (from JobNimbus settings)
- [ ] **QuickBooks Client ID & Secret** (from Intuit Developer Portal)
- [ ] **QuickBooks Refresh Token** (from OAuth2 flow — see docs/11)
- [ ] **QuickBooks Realm ID** (your company ID)
- [ ] **Internal API Key** (generate: `openssl rand -hex 32`)

### 2.3 Recommended: Staging vs. Production

For staging:

- Use **test/sandbox credentials** for JobNimbus and QuickBooks
- Use a **separate Railway project** (e.g., "Green Energy - Staging")
- Use **separate Vercel projects** (e.g., "greenenergy-portal-staging")
- Set `NODE_ENV=staging` or keep as `development`
- Optionally disable workflow automation (`WORKFLOW_AUTOMATION_ENABLED=false`)

For production:

- Use **live credentials**
- Use production Railway + Vercel projects
- Set `NODE_ENV=production`
- Enable monitoring and alerting (future sprint)

---

## 3. Environment Variables Overview

This section summarizes the **minimum required environment variables** for each service. For full details, see [docs/11-deployment-and-environments.md](./11-deployment-and-environments.md).

### 3.1 Core API (Railway)

**Essential variables:**

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway auto-injects this

# JobNimbus
JOBNIMBUS_BASE_URL=https://api.jobnimbus.com
JOBNIMBUS_API_KEY=your-api-key
JOBNIMBUS_SYNC_ENABLED=true
JOBNIMBUS_SYNC_CRON=*/15 * * * *

# Customer Portal
PORTAL_BASE_URL=https://portal.yourdomain.com
PORTAL_ORIGIN=https://portal.yourdomain.com
PORTAL_SESSION_TTL_DAYS=7
INTERNAL_API_KEY=your-secure-internal-api-key

# QuickBooks (optional for staging)
QB_ENABLED=true
QB_CLIENT_ID=your-qb-client-id
QB_CLIENT_SECRET=your-qb-client-secret
QB_REFRESH_TOKEN=your-refresh-token
QB_REALM_ID=your-realm-id
QB_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
QB_BASE_URL=https://quickbooks.api.intuit.com

# Workflow Automation (optional for staging)
WORKFLOW_AUTOMATION_ENABLED=false
WORKFLOW_AUTOMATION_DAILY_LIMIT=500
```

### 3.2 Customer Portal (Vercel)

```bash
NEXT_PUBLIC_API_BASE_URL=https://api-greenenergy.up.railway.app/api/v1
```

### 3.3 Internal Dashboard (Vercel)

```bash
# Server-only (do not use NEXT_PUBLIC_)
CORE_API_BASE_URL=https://api-greenenergy.up.railway.app
INTERNAL_API_KEY=your-secure-internal-api-key
```

### 3.4 Smoke Tests (Local & CI)

After deployment, set these in your **local `.env`** file (or in your shell) to run smoke tests:

```bash
STAGING_CORE_API_BASE_URL=https://api-greenenergy.up.railway.app
STAGING_INTERNAL_DASHBOARD_BASE_URL=https://dashboard.yourdomain.com
STAGING_CUSTOMER_PORTAL_BASE_URL=https://portal.yourdomain.com
STAGING_INTERNAL_API_KEY=your-secure-internal-api-key
```

**Important**: These variables are used by the smoke test script running on your local machine or in GitHub Actions CI. They point to your deployed staging/production URLs. For CI, these are configured as GitHub Secrets.

---

## 4. Step-by-Step Go-Live Flow

### High-Level Checklist

- [ ] 1. Deploy PostgreSQL on Railway
- [ ] 2. Deploy Core API on Railway
- [ ] 3. Run database migrations
- [ ] 4. Deploy Customer Portal on Vercel
- [ ] 5. Deploy Internal Dashboard on Vercel
- [ ] 6. Configure smoke test environment variables locally
- [ ] 7. Run `pnpm smoke:staging`
- [ ] 8. Interpret results and troubleshoot if needed
- [ ] 9. Perform manual UI verification
- [ ] 10. (Optional) Set up custom domains

### 4.1 Deploy PostgreSQL (Railway)

1. Log in to [Railway](https://railway.app)
2. Create a new project: **"Green Energy Platform - Staging"** (or "Production")
3. Click **+ New** → **Database** → **PostgreSQL**
4. Railway provisions PostgreSQL 15 and auto-generates `DATABASE_URL`
5. Note the connection string (visible in **Variables** tab)

### 4.2 Deploy Core API (Railway)

1. In the same Railway project, click **+ New** → **GitHub Repo**
2. Authorize Railway to access your `greenenergy-platform` repository
3. Select the repository
4. Configure the service:
   - **Root Directory**: `apps/core-api`
   - **Build Command**: *(leave empty — Dockerfile is used)*
   - **Start Command**: *(leave empty — Dockerfile CMD is used)*
5. Add all environment variables from section 3.1 above
   - **Tip**: Use Railway's variable reference for `DATABASE_URL`:  
     `DATABASE_URL=${{Postgres.DATABASE_URL}}`
6. Railway auto-detects the Dockerfile and builds the service
7. Once deployed, Railway assigns a public URL (e.g., `https://greenenergy-production.up.railway.app`)
8. **Copy this URL** — you'll need it for the frontends

### 4.3 Run Database Migrations

**After the Core API is deployed:**

1. Option A: Via Railway CLI (locally connected to Railway):

   ```bash
   railway link
   railway run npx prisma migrate deploy
   ```

2. Option B: SSH into Railway service:

   ```bash
   railway run bash
   npx prisma migrate deploy
   exit
   ```

3. (Optional) Seed JobNimbus data:

   ```bash
   railway run pnpm run seed:jobnimbus
   ```

### 4.4 Deploy Customer Portal (Vercel)

**Via Vercel Dashboard:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository `greenenergy-platform`
3. Configure the project:
   - **Project Name**: `greenenergy-customer-portal-staging`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/customer-portal`
   - **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/customer-portal`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install` (Vercel auto-detects `pnpm-lock.yaml`)
4. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://greenenergy-production.up.railway.app/api/v1`  
     *(use the Railway URL from step 4.2)*
5. Click **Deploy**
6. **Copy the deployed URL** (e.g., `https://greenenergy-customer-portal-staging.vercel.app`)

### 4.5 Deploy Internal Dashboard (Vercel)

**Same steps as Customer Portal, but:**

- **Project Name**: `greenenergy-internal-dashboard-staging`
- **Root Directory**: `apps/internal-dashboard`
- **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/internal-dashboard`
- **Environment Variables**:
  - `CORE_API_BASE_URL` = `https://greenenergy-production.up.railway.app` *(no `/api/v1`)*
  - `INTERNAL_API_KEY` = `your-secure-internal-api-key` *(same value as `INTERNAL_API_KEY` in Core API)*

These must be **server-only** variables on Vercel (do not use the `NEXT_PUBLIC_` prefix).

### 4.6 Configure Smoke Test Environment Variables

On your **local development machine**, add these to your `.env` file (or set them in your shell):

```bash
STAGING_CORE_API_BASE_URL=https://greenenergy-production.up.railway.app
STAGING_INTERNAL_DASHBOARD_BASE_URL=https://greenenergy-internal-dashboard-staging.vercel.app
STAGING_CUSTOMER_PORTAL_BASE_URL=https://greenenergy-customer-portal-staging.vercel.app
STAGING_INTERNAL_API_KEY=your-secure-internal-api-key
```

**Replace** the URLs with your actual deployed URLs from steps 4.2, 4.4, and 4.5.

**For CI/CD**: These same variables should be set as **GitHub Secrets** for automated smoke tests (see docs/20-release-and-staging-playbook.md).

### 4.7 Run Smoke Tests

From your local repo root:

```bash
pnpm smoke:staging
```

The script will:

1. Validate that all required environment variables are set
2. Test 6 critical endpoints/pages:
  - API health check (`/api/v1/health`)
  - Command Center Overview API (`/api/v1/command-center/overview`)
   - Workflow Rules API (`/api/v1/workflows/rules`)
   - Internal Dashboard command center page
   - Internal Dashboard workflows page
   - Customer portal root page
3. Print a summary of passed/failed checks
4. Exit with code `0` (success) or `1` (failure)

### 4.8 Interpret Smoke Test Results

**All ✅ checks passed:**

- Your staging environment is working correctly!
- Proceed to manual UI verification (section 6)

**Some ❌ checks failed:**

- Review the error messages
- Common issues:
  - **404 or 500 on API health**: Database or environment misconfiguration
  - **401/403 on internal endpoints**: Wrong `STAGING_INTERNAL_API_KEY` (must match Core API's `INTERNAL_API_KEY`)
  - **200 but expected content not found**: Possible wrong URL or page not deployed correctly
- See **Troubleshooting** section (5) below

### 4.9 Manual UI Verification

After smoke tests pass, **manually verify** the key flows:

**Internal Dashboard:**

- [ ] Navigate to `/command-center` — verify overview cards load
- [ ] Navigate to `/workflows` — verify rules list loads
- [ ] Navigate to `/dispatch` — verify dispatch recommendations load
- [ ] Navigate to `/profit` — verify profit dashboard summary loads

**Customer Portal:**

- [ ] Visit root page — verify it loads (may show "no jobs" or require a token)
- [ ] (Optional) Generate a magic link for a test job and verify full portal flow

**Core API (via Railway logs):**

- [ ] Check Railway logs for any startup errors
- [ ] Verify database connection is successful
- [ ] (Optional) Verify JobNimbus sync runs without errors

### 4.10 (Optional) Set Up Custom Domains

**For Vercel:**

1. In Vercel Dashboard → Project Settings → Domains
2. Add your custom domain (e.g., `portal.greenenergy.com`)
3. Follow DNS instructions to point domain to Vercel

**For Railway:**

1. In Railway service settings → Domains
2. Add custom domain (e.g., `api.greenenergy.com`)
3. Update DNS records as instructed

**After adding custom domains:**

- Update all environment variables (Core API `PORTAL_BASE_URL`, frontend `NEXT_PUBLIC_API_BASE_URL`, smoke test URLs)
- Re-run smoke tests to verify

---

## 5. Troubleshooting Common Issues

### Issue 1: Smoke Test Fails with "Missing required environment variables"

**Cause**: Smoke test environment variables not set locally.

**Solution**:

- Verify you have added the four `STAGING_*` variables to your local `.env` file
- Ensure the variable names are spelled correctly
- Run `pnpm smoke:staging` again

### Issue 2: API Health Check Fails (404 or 500)

**Possible Causes**:

- Core API not deployed or crashed
- Database connection failed (`DATABASE_URL` misconfigured)
- Railway service is still building

**Solution**:

1. Check Railway logs for the Core API service
2. Verify `DATABASE_URL` is set correctly (use `${{Postgres.DATABASE_URL}}`)
3. Verify migrations have been run (`npx prisma migrate deploy`)
4. Restart the Railway service if needed

### Issue 3: Command Center Overview API Fails (401 or 403)

**Cause**: Incorrect or missing `STAGING_INTERNAL_API_KEY`.

**Solution**:

- Verify the `STAGING_INTERNAL_API_KEY` in your local `.env` matches the `INTERNAL_API_KEY` set in the Core API on Railway
- Regenerate the key if needed and update both places
- Ensure the key has no extra spaces or quotes

### Issue 4: Internal Dashboard Page Returns 200 but "Expected content not found"

**Possible Causes**:

- Wrong URL (pointing to a different environment)
- Next.js app deployed but errored during page render (check Vercel logs)
- Page content changed (expected text no longer present)

**Solution**:

1. Manually visit the URL in a browser and inspect the page
2. Check Vercel deployment logs for build/runtime errors
3. If the page loads but content is different, update the smoke test to look for new expected text

### Issue 5: Customer Portal Fails Smoke Test

**Possible Causes**:

- Portal not deployed or build failed
- `NEXT_PUBLIC_API_BASE_URL` not set correctly in Vercel env vars
- Portal requires authentication for root page

**Solution**:

1. Check Vercel deployment logs
2. Verify `NEXT_PUBLIC_API_BASE_URL` is correct
3. If the portal requires a token at root, adjust the smoke test to check for an expected "login" or "status" page instead

### Issue 6: "Network Error" or Fetch Fails

**Possible Causes**:

- URL typo in smoke test env vars
- Service is down
- Firewall or DNS issue

**Solution**:

1. Copy-paste the URL from your env vars into a browser and verify it loads
2. Check Railway/Vercel status pages for outages
3. Verify your local network/firewall settings

---

## 6. Next Steps: Manual Verification

After all smoke tests pass, perform these **manual checks** to ensure the platform is fully operational:

### 6.1 Internal Dashboard

- [ ] Open `/command-center` and verify:
  - Overview cards display correct counts
  - Jobs list loads
  - Subcontractors and materials sections render
- [ ] Open `/workflows` and verify:
  - Workflow rules list displays
  - Can enable/disable rules (if implemented)
- [ ] Open `/dispatch` and verify:
  - Dispatch recommendations load for a given date
  - Crew assignment UI works (if staging has test data)
- [ ] Open `/profit` and verify:
  - Profit dashboard summary loads
  - QuickBooks sync button works (if QB is configured)

### 6.2 Customer Portal

- [ ] Visit root page — should load without errors
- [ ] Generate a magic link for a test job (via Core API or internal dashboard)
- [ ] Open the magic link in an incognito window
- [ ] Verify:
  - Job status page loads
  - Photos section displays
  - Documents section displays
  - Can upload photos/documents (if implemented)

### 6.3 Core API (via Railway Logs)

- [ ] Check Railway logs for:
  - Successful database connection
  - JobNimbus sync runs (every 15 minutes)
  - No critical errors or crashes
- [ ] (Optional) Trigger a manual JobNimbus sync via Swagger or internal dashboard

### 6.4 QuickBooks Integration (If Enabled)

- [ ] Profit Dashboard → Click "Sync All from QuickBooks"
- [ ] Verify:
  - No token refresh errors in Railway logs
  - Contract amounts populate in profit data
  - Sync completes successfully

---

## 7. Post-Deployment Best Practices

After successful deployment and verification:

### 7.1 Monitoring & Alerting

- [ ] Set up uptime monitoring (e.g., UptimeRobot, Railway health checks)
- [ ] (Future) Integrate error tracking (Sentry, LogRocket)
- [ ] Monitor Railway/Vercel logs daily for the first week

### 7.2 Security

- [ ] Never commit `.env` files to Git
- [ ] Rotate `INTERNAL_API_KEY` quarterly
- [ ] Enable 2FA on all accounts (Railway, Vercel, GitHub)
- [ ] Restrict Railway/Vercel project access to authorized team members only

### 7.3 Updates & Rollbacks

**For Core API (Railway):**

- Push code to `main` branch → Railway auto-deploys
- Rollback: Railway Dashboard → Deployments → Redeploy previous version

**For Frontends (Vercel):**

- Push code to `main` → Vercel auto-deploys
- Rollback: Vercel Dashboard → Deployments → Promote previous deployment

### 7.4 Smoke Tests as Part of CI/CD

**Recommended**: Run smoke tests as part of your CI/CD pipeline:

1. Deploy to staging (Railway + Vercel)
2. Run `pnpm smoke:staging` from CI (GitHub Actions, etc.)
3. If smoke tests pass, promote to production
4. If smoke tests fail, block production deployment

---

## 8. Smoke Test Implementation Details

### What the Smoke Test Script Does

The `@greenenergy/smoke-tests` package performs the following checks:

1. **API Health Check**: `GET /api/v1/health`
   - Expects `{ status: 'ok' }`
2. **Command Center Overview API**: `GET /api/v1/command-center/overview`
   - Requires `x-internal-api-key` header
   - Validates response shape (jobs, subcontractors, materials)
3. **Workflow Rules API**: `GET /api/v1/workflows/rules`
   - Requires `x-internal-api-key` header
   - Validates response is an array
4. **Internal Dashboard - Command Center Page**: `GET /command-center`
   - Checks HTML for "Command Center" text
5. **Internal Dashboard - Workflows Page**: `GET /workflows`
   - Checks HTML for "Workflow" text
6. **Customer Portal - Root Page**: `GET /`
   - Checks HTML for "Green Energy" or "Status" or "Job" text

### Customizing Smoke Tests

To add more checks:

1. Edit `tools/smoke-tests/src/index.ts`
2. Add a new `private async check...()` method
3. Call it in the `run()` method
4. Rebuild: `pnpm --filter @greenenergy/smoke-tests run build`
5. Test locally: `pnpm smoke:staging`

---

## 9. Summary

This document provides a **complete operational playbook** for deploying the Green Energy Platform to staging and production.

**Key Takeaways:**

- **Always run smoke tests** after deployment to catch issues early
- **Manual UI verification** is still important, but smoke tests give you fast confidence
- **Troubleshooting section** covers common issues with clear solutions
- **Iterative approach**: Deploy to staging first, validate, then promote to production

**Next Steps (Future Phases):**

- Integrate smoke tests into CI/CD pipeline
- Set up uptime monitoring and alerting
- Add more comprehensive E2E tests
- Performance benchmarking and load testing

---

**End of Staging Smoke Tests & Go-Live Checklist**
