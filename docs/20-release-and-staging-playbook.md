# Phase 9 Sprint 1: Release & Staging Playbook

**Status**: ✅ COMPLETED  
**Completion Date**: 2025-12-11

---

## Overview

This document provides a **complete operational playbook** for deploying, testing, and releasing the Green Energy Platform. It covers:

1. **Environments Overview** - Local, staging, and production environments
2. **Staging Deployment Path** - Step-by-step guide to deploy staging using Railway + Vercel
3. **GitHub Secrets Configuration** - How to configure secrets for automated smoke tests
4. **Staging Smoke Tests** - Running smoke tests locally and in CI
5. **Release Checklist v1** - Quality gates before production deployment
6. **Troubleshooting** - Common issues and solutions

This sprint focuses on making staging deployment **repeatable and validated** through automated smoke tests and clear operational procedures.

---

## 1. Environments Overview

### 1.1 Local Development

**Purpose**: Developer workstation for feature development and testing

**Services**:
- **Database**: PostgreSQL in Docker at `localhost:5432`
- **Core API**: `localhost:3000` (NestJS)
- **Internal Dashboard**: `localhost:3002` (Next.js)
- **Customer Portal**: `localhost:3001` (Next.js)

**Setup**:
```bash
# Start database
docker-compose -f infra/docker/docker-compose.yml up -d

# Run migrations
pnpm --filter @greenenergy/db db:migrate

# Start services (in separate terminals)
pnpm --filter @greenenergy/core-api dev
pnpm --filter @greenenergy/internal-dashboard dev
pnpm --filter @greenenergy/customer-portal dev
```

### 1.2 Staging

**Purpose**: Pre-production environment for validation and QA

**Services**:
- **Core API**: Railway (Dockerfile deployment)
- **Database**: Railway PostgreSQL 15
- **Internal Dashboard**: Vercel (Next.js)
- **Customer Portal**: Vercel (Next.js)

**Key Characteristics**:
- Uses **test/sandbox credentials** for external integrations (JobNimbus, QuickBooks)
- Separate Railway + Vercel projects from production
- Automated smoke tests run via GitHub Actions (daily + on-demand)
- `NODE_ENV=production` (same build as production)

### 1.3 Production (Future)

**Purpose**: Live customer-facing environment

**Services**: Same architecture as staging, but with:
- Live credentials for JobNimbus and QuickBooks
- Custom domains
- Enhanced monitoring and alerting
- Production-grade backups and disaster recovery

---

## 2. Staging Deployment Path

This section summarizes the deployment steps. For full details, see:
- [Deployment & Environments Guide (docs/11)](./11-deployment-and-environments.md)
- [Staging Smoke Tests & Go-Live Checklist (docs/16)](./16-staging-smoke-tests-and-go-live-checklist.md)

### 2.1 Prerequisites

Before deploying staging, ensure you have:

- [ ] **Railway account** ([railway.app](https://railway.app))
- [ ] **Vercel account** ([vercel.com](https://vercel.com))
- [ ] **GitHub repository** (already set up)
- [ ] **JobNimbus test API key** (from JobNimbus sandbox/test account)
- [ ] **QuickBooks test credentials** (optional for staging):
  - Client ID & Secret
  - Refresh Token
  - Realm ID
- [ ] **Internal API Key** (generate: `openssl rand -hex 32`)

### 2.2 Deployment Steps

#### Step 1: Deploy PostgreSQL on Railway

1. Log in to Railway
2. Create new project: "Green Energy Platform - Staging"
3. Click **+ New** → **Database** → **PostgreSQL**
4. Railway auto-generates `DATABASE_URL`

#### Step 2: Deploy Core API on Railway

**Note**: The repository includes a **version-controlled `railway.json`** at the root that tells Railway where the Dockerfile is (`apps/core-api/Dockerfile`) and how to start the app. Railway automatically detects and uses this configuration.

1. In same Railway project, click **+ New** → **GitHub Repo**
2. Select `greenenergy-platform` repository
3. Railway automatically detects `railway.json` and configures:
   - Dockerfile path: `apps/core-api/Dockerfile`
   - Start command: `node apps/core-api/dist/main.js`
   - Watch patterns for auto-rebuilds
   - **No manual root directory configuration needed**
4. The Dockerfile uses the monorepo root build pipeline:
   - Root `tsconfig*.json` and `turbo.json` are copied for TypeScript path resolution
   - Build runs from monorepo root via `pnpm build --filter @greenenergy/core-api...`
   - This ensures workspace packages (`@greenenergy/db`, `@greenenergy/shared-types`, etc.) resolve correctly
5. Add environment variables (see section 3 below)
6. Railway builds and deploys
7. **Note the public URL** (e.g., `https://staging-api.railway.app`)

#### Step 3: Run Database Migrations

```bash
railway link  # Link to your Railway project
railway run npx prisma migrate deploy
```

#### Step 4: Deploy Internal Dashboard on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `greenenergy-platform` repository
3. Configure:
   - **Project Name**: `greenenergy-internal-dashboard-staging`
   - **Framework**: Next.js
   - **Root Directory**: `apps/internal-dashboard`
   - **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/internal-dashboard`
4. Add environment variables (**server-only**, do **not** use `NEXT_PUBLIC_`):
   - `CORE_API_BASE_URL` = Railway API URL (no `/api/v1`)
   - `INTERNAL_API_KEY` = Your internal API key
5. Deploy

#### Step 5: Deploy Customer Portal on Vercel

Same as Internal Dashboard, but:
- **Project Name**: `greenenergy-customer-portal-staging`
- **Root Directory**: `apps/customer-portal`
- **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/customer-portal`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_BASE_URL` = Railway API URL + `/api/v1`

---

## 3. Environment Variables Reference

### 3.1 Core API (Railway)

**Essential variables**:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway auto-injects

# JobNimbus (test credentials)
JOBNIMBUS_BASE_URL=https://api.jobnimbus.com
JOBNIMBUS_API_KEY=your-test-api-key
JOBNIMBUS_SYNC_ENABLED=true
JOBNIMBUS_SYNC_CRON=*/15 * * * *

# Customer Portal
PORTAL_BASE_URL=https://your-staging-portal.vercel.app
PORTAL_ORIGIN=https://your-staging-portal.vercel.app
PORTAL_SESSION_TTL_DAYS=7
INTERNAL_API_KEY=your-secure-internal-api-key

# QuickBooks (optional for staging)
QB_ENABLED=false  # or true with test credentials
QB_CLIENT_ID=your-test-qb-client-id
QB_CLIENT_SECRET=your-test-qb-client-secret
QB_REFRESH_TOKEN=your-test-refresh-token
QB_REALM_ID=your-test-realm-id
QB_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
QB_BASE_URL=https://quickbooks.api.intuit.com

# Optional: Email, SMS, CX Engine, Finance features
# See docs/11 for full list
```

### 3.2 Internal Dashboard (Vercel)

```bash
# Server-only (do not use NEXT_PUBLIC_)
CORE_API_BASE_URL=https://staging-api.railway.app
INTERNAL_API_KEY=your-secure-internal-api-key
```

### 3.3 Customer Portal (Vercel)

```bash
NEXT_PUBLIC_API_BASE_URL=https://staging-api.railway.app/api/v1
```

**Important**: Never commit these values to Git. Railway and Vercel store them securely in their platforms.

---

## 4. GitHub Secrets Configuration

To enable **automated smoke tests** via GitHub Actions, configure these secrets in your repository:

### 4.1 How to Add GitHub Secrets

1. Go to your GitHub repository: `https://github.com/yosiwizman/greenenergy-platform`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `STAGING_CORE_API_BASE_URL` | Railway Core API URL (no `/api/v1`) | `https://staging-api.railway.app` |
| `STAGING_INTERNAL_DASHBOARD_BASE_URL` | Vercel Internal Dashboard URL | `https://greenenergy-internal-staging.vercel.app` |
| `STAGING_CUSTOMER_PORTAL_BASE_URL` | Vercel Customer Portal URL | `https://greenenergy-portal-staging.vercel.app` |
| `STAGING_INTERNAL_API_KEY` | Internal API key (same as Core API) | `abc123...` |

### 4.2 Verifying Secrets

After adding secrets:
1. Go to **Actions** tab in GitHub
2. Select **Staging Smoke Tests** workflow
3. Click **Run workflow** → **Run workflow**
4. Check the workflow run to ensure smoke tests pass

---

## 5. Staging Smoke Tests

### 5.1 What the Smoke Tests Do

The smoke test script (`tools/smoke-tests`) validates that:

1. **API Health Check**: Core API `/api/v1/health` endpoint returns `{ status: 'ok' }`
2. **Command Center Overview API**: Protected endpoint accessible with internal API key
3. **Workflow Rules API**: Returns array of workflow rules
4. **Internal Dashboard Pages**: Command center and workflows pages load correctly
5. **Customer Portal**: Root page loads without errors

### 5.2 Running Smoke Tests Locally

**Setup**:
1. After deploying to staging, create a `.env` file in repo root:

```bash
STAGING_CORE_API_BASE_URL=https://your-staging-api.railway.app
STAGING_INTERNAL_DASHBOARD_BASE_URL=https://your-staging-dashboard.vercel.app
STAGING_CUSTOMER_PORTAL_BASE_URL=https://your-staging-portal.vercel.app
STAGING_INTERNAL_API_KEY=your-secure-internal-api-key
```

2. Run the tests:

```bash
pnpm smoke:staging
```

**Expected Output**:

```
🚀 Starting staging smoke tests...

Target URLs:
  API: https://staging-api.railway.app
  Internal Dashboard: https://staging-dashboard.vercel.app
  Customer Portal: https://staging-portal.vercel.app

✅ API Health Check: OK (200) - API is healthy
✅ Command Center Overview API: OK (200) - Command Center data loaded
✅ Workflow Rules API: OK (200) - 8 workflow rules found
✅ Internal Dashboard - Command Center Page: OK (200) - Page loaded successfully
✅ Internal Dashboard - Workflows Page: OK (200) - Page loaded successfully
✅ Customer Portal - Root Page: OK (200) - Portal loaded successfully

============================================================
SUMMARY
============================================================

Total checks: 6
Passed: 6
Failed: 0

✅ All smoke tests PASSED!
Your staging environment appears to be working correctly.
Proceed with manual UI verification as documented.
```

### 5.3 Running Smoke Tests in CI

**GitHub Actions Workflow**: `.github/workflows/staging-smoke.yml`

### 5.4 UI Smoke Tests (Playwright)

The Playwright UI smoke suite runs against the deployed staging Vercel apps (no local server required):

```bash
pnpm test:ui:staging
```

**GitHub Actions Workflow**: `.github/workflows/staging-ui-smoke.yml` (runs daily and on-demand).

No secrets are required by the UI smoke workflow; it validates that key pages render and that there are no console errors or failing `/api/v1/*` requests on the deployed apps.

**Triggers**:
- **Manual**: Go to Actions → Staging Smoke Tests → Run workflow
- **Scheduled**: Daily at 09:00 UTC (configurable)

**How It Works**:
1. Checks out repository
2. Installs Node.js 20 and pnpm 9
3. Installs dependencies with caching
4. Runs `pnpm smoke:staging`
5. Uses GitHub Secrets for environment variables

**Viewing Results**:
- Go to **Actions** tab in GitHub
- Click on the workflow run
- Expand "Run staging smoke tests" step
- Review pass/fail status

### 5.4 Troubleshooting Failed Smoke Tests

See **[Troubleshooting Section in docs/16](./16-staging-smoke-tests-and-go-live-checklist.md#5-troubleshooting-common-issues)** for detailed solutions to common issues:

- Missing environment variables
- API health check failures (500/404)
- Authentication errors (401/403)
- Page content not found
- Network errors

---

## 6. Release Checklist v1

Use this checklist before deploying to production or promoting a new feature:

### 6.1 Pre-Merge Checklist (Feature Branch → Main)

Before merging any feature branch to `main`:

- [ ] All CI checks pass:
  - [ ] Install dependencies
  - [ ] Lint (`pnpm lint`)
  - [ ] Tests (`pnpm test`)
  - [ ] Build (`pnpm build`)
- [ ] Code review completed (if team has multiple developers)
- [ ] Feature tested locally
- [ ] No secrets or sensitive data committed

### 6.2 Post-Deploy to Staging Checklist

After deploying `main` to staging:

- [ ] Railway Core API deployment successful
- [ ] Vercel Internal Dashboard deployment successful
- [ ] Vercel Customer Portal deployment successful
- [ ] Database migrations applied successfully
- [ ] Smoke tests pass (via GitHub Actions or locally):
  - [ ] `pnpm smoke:staging` → all checks ✅
- [ ] `/ops` dashboard shows all services UP (if Phase 8 metrics are deployed)
- [ ] Manual UI verification (see section 6.3)

### 6.3 Manual UI Verification

**Internal Dashboard**:
- [ ] `/command-center` - Overview cards load
- [ ] `/workflows` - Workflow rules display
- [ ] `/dispatch` - Dispatch recommendations load
- [ ] `/profit` - Profit dashboard displays
- [ ] `/ops` - Ops status dashboard shows healthy services

**Customer Portal**:
- [ ] Root page loads
- [ ] (Optional) Generate magic link and verify full portal flow

**Core API (via Railway Logs)**:
- [ ] No startup errors
- [ ] Database connection successful
- [ ] JobNimbus sync runs without errors (if enabled)

### 6.4 Before Production Cutover (Future)

When ready to deploy to production (future sprint):

- [ ] All staging checklist items complete
- [ ] Executive digest emails validated (if Phase 7 features deployed)
- [ ] SMS/email providers verified with test customers
- [ ] QuickBooks integration verified with production credentials (test on staging first)
- [ ] Load testing completed (optional, for high-traffic sites)
- [ ] Monitoring and alerting configured (e.g., uptime monitors, error tracking)
- [ ] Backup and disaster recovery plan documented
- [ ] Rollback plan documented and tested

---

## 7. Continuous Deployment (Future Enhancement)

**Current State** (Phase 9 Sprint 1):
- Staging smoke tests run on-demand and daily
- Deployments are manual (push to Railway/Vercel)

**Future Enhancements**:
1. **Auto-Deploy to Staging**: Push to `main` → auto-deploy to staging → run smoke tests
2. **Auto-Promote to Production**: If staging smoke tests pass, auto-promote to production (with approval gate)
3. **Integration with Slack/Discord**: Notify team on deployment success/failure
4. **Automated Rollback**: If smoke tests fail, auto-rollback to previous version

---

## 8. Common Scenarios

### Scenario 1: Deploying a New Feature

1. Create feature branch from `main`
2. Develop and test locally
3. Push branch and create PR
4. Wait for CI checks (lint, test, build)
5. Merge to `main` after approval
6. Manually deploy to staging (Railway + Vercel auto-deploy if connected to `main`)
7. Run `pnpm smoke:staging` locally or via GitHub Actions
8. If smoke tests pass, proceed to production (when ready)

### Scenario 2: Hotfix for Production Issue

1. Create hotfix branch from `main` (or from production tag)
2. Apply fix and test locally
3. Push branch and create PR
4. Merge to `main` after CI checks
5. Deploy to staging
6. Run smoke tests
7. If urgent, deploy to production immediately (with caution)
8. Monitor production logs and metrics

### Scenario 3: Smoke Tests Fail After Deployment

1. Review smoke test output to identify which check failed
2. Check Railway/Vercel logs for errors
3. Verify environment variables are correct
4. If needed, rollback deployment:
   - Railway: Deployments → Redeploy previous version
   - Vercel: Deployments → Promote previous deployment
5. Fix issue locally, test, and redeploy

---

## 9. Best Practices

### 9.1 Environment Variables

- **Never commit secrets** to Git (use `.env.example` as template)
- Use **Railway variable references** for database URL: `${{Postgres.DATABASE_URL}}`
- Keep **staging and production secrets separate**
- Rotate API keys and tokens quarterly

### 9.2 Testing

- Run smoke tests after **every staging deployment**
- Run full test suite (`pnpm test`) before merging to `main`
- Use **test/sandbox credentials** for staging (never production keys)

### 9.3 Deployments

- Deploy to staging first, always
- Use **custom domains** for production (not auto-generated URLs)
- Monitor logs for the first hour after deployment
- Document rollback plan before deploying

### 9.4 Monitoring (Future)

- Set up uptime monitoring (UptimeRobot, Railway health checks)
- Configure alerting for high error rates
- Use `/metrics` endpoint (Phase 8) for Prometheus integration
- Monitor `/ops` dashboard for service health

---

## 10. Related Documentation

- **[Deployment & Environments Guide](./11-deployment-and-environments.md)** - Full deployment details
- **[Staging Smoke Tests & Go-Live Checklist](./16-staging-smoke-tests-and-go-live-checklist.md)** - Detailed smoke test guide
- **[Production Readiness & Observability](./19-production-readiness-and-observability.md)** - Metrics, logging, ops dashboard

---

## 11. Support & Troubleshooting

### Getting Help

- **Documentation**: Start with docs/11, docs/16, and docs/19
- **GitHub Issues**: Create issue for bugs or feature requests
- **Railway Support**: [Railway Discord](https://discord.gg/railway)
- **Vercel Support**: [Vercel Support](https://vercel.com/support)

### Common Issues

See **[Troubleshooting Section in docs/16](./16-staging-smoke-tests-and-go-live-checklist.md#5-troubleshooting-common-issues)** for detailed solutions.

---

**End of Release & Staging Playbook**

*This document is a living guide and should be updated as the platform evolves.*
