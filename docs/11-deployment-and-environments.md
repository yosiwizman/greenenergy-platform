# Phase 3 Sprint 3: Deployment & Environments

**Status**: ✅ COMPLETED  
**Completion Date**: 2025-01-XX

---

## Overview

This document provides a **complete deployment guide** for the Green Energy Platform monorepo. It covers:

1. **Architecture**: Which services go where (Vercel for frontends, Railway for backend + database)
2. **Environments**: Local, Staging, Production
3. **Environment Variables**: Complete list for all services
4. **Step-by-Step Deployment**: Vercel setup for Next.js apps, Railway setup for NestJS API + PostgreSQL
5. **External Integrations**: JobNimbus, QuickBooks connectivity
6. **Rollout Strategy**: How to safely deploy to production

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Production Stack                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐       ┌──────────────────┐            │
│  │  Vercel Project  │       │  Vercel Project  │            │
│  │   #1: Customer   │       │   #2: Internal   │            │
│  │     Portal       │       │    Dashboard     │            │
│  │  (Next.js 14)    │       │  (Next.js 14)    │            │
│  └────────┬─────────┘       └────────┬─────────┘            │
│           │                          │                       │
│           └──────────────┬───────────┘                       │
│                          │                                   │
│                          ▼                                   │
│            ┌──────────────────────────┐                      │
│            │   Railway Service #1     │                      │
│            │    Core API (NestJS)     │                      │
│            │   Node 20 + Dockerfile   │                      │
│            └───────────┬──────────────┘                      │
│                        │                                     │
│                        ▼                                     │
│            ┌──────────────────────────┐                      │
│            │   Railway Service #2     │                      │
│            │  PostgreSQL 15 Database  │                      │
│            └──────────────────────────┘                      │
│                                                               │
│  External APIs:                                              │
│  • JobNimbus API (https://api.jobnimbus.com)                │
│  • QuickBooks API (via OAuth2)                               │
└─────────────────────────────────────────────────────────────┘
```

### Why This Stack?

- **Vercel**: Optimized for Next.js apps, automatic HTTPS, edge caching, great DX
- **Railway**: Easy deployment for NestJS + PostgreSQL, simple environment management, automatic restarts
- **Separation of concerns**: Frontends are stateless, backend + DB are on Railway with persistent storage

---

## 2. Environments

### 2.1 Local Development

- **Database**: PostgreSQL running locally (Docker recommended) at `localhost:5432`
- **Core API**: Runs on `localhost:3000` via `pnpm --filter @greenenergy/core-api dev`
- **Customer Portal**: Runs on `localhost:3001` via `pnpm --filter @greenenergy/customer-portal dev`
- **Internal Dashboard**: Runs on `localhost:3002` via `pnpm --filter @greenenergy/internal-dashboard dev`

### 2.2 Staging (Optional)

- Same architecture as production, but separate Vercel + Railway projects
- Use different JobNimbus/QuickBooks credentials (sandbox/test accounts)
- Recommended for testing before production rollout

### 2.3 Production

- **Customer Portal**: `https://portal.yourdomain.com` (or auto-generated Vercel URL)
- **Internal Dashboard**: `https://dashboard.yourdomain.com` (or auto-generated Vercel URL)
- **Core API**: `https://api-greenenergy.up.railway.app` (or custom domain)
- **Database**: Managed PostgreSQL on Railway

---

## 3. Environment Variables

### 3.1 Core API (`apps/core-api`)

**Required for all environments:**

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"

# JobNimbus API
JOBNIMBUS_BASE_URL="https://api.jobnimbus.com"
JOBNIMBUS_API_KEY="your-api-key-here"
JOBNIMBUS_SYNC_CRON="*/15 * * * *"  # Every 15 minutes
JOBNIMBUS_SYNC_ENABLED="true"

# Customer Portal Integration
PORTAL_BASE_URL="https://portal.yourdomain.com"
PORTAL_ORIGIN="https://portal.yourdomain.com"
PORTAL_SESSION_TTL_DAYS="7"
INTERNAL_API_KEY="your-secure-internal-api-key"

# QuickBooks OAuth2 (Production)
QB_ENABLED="true"
QB_CLIENT_ID="your-quickbooks-client-id"
QB_CLIENT_SECRET="your-quickbooks-client-secret"
QB_REFRESH_TOKEN="your-refresh-token-from-oauth-flow"
QB_TOKEN_URL="https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
QB_REALM_ID="your-company-realm-id"
QB_BASE_URL="https://quickbooks.api.intuit.com"

# Optional: Fallback access token (not recommended for production)
# QB_ACCESS_TOKEN="your-fallback-token"
```

**Notes:**

- `DATABASE_URL`: Railway will auto-inject this if using Railway PostgreSQL
- `INTERNAL_API_KEY`: Generate a strong secret (e.g., `openssl rand -hex 32`)
- `QB_REFRESH_TOKEN`: Obtain via QuickBooks OAuth2 playground or initial auth flow
- `QB_REALM_ID`: Your QuickBooks company ID

### 3.2 Customer Portal (`apps/customer-portal`)

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL="https://api-greenenergy.up.railway.app/api/v1"
```

**Notes:**

- `NEXT_PUBLIC_API_BASE_URL`: Must point to your deployed Core API on Railway
- For local dev: `"http://localhost:3000/api/v1"`

### 3.3 Internal Dashboard (`apps/internal-dashboard`)

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL="https://api-greenenergy.up.railway.app/api/v1"
NEXT_PUBLIC_INTERNAL_API_KEY="your-secure-internal-api-key"
```

**Notes:**

- `NEXT_PUBLIC_API_BASE_URL`: Must point to your deployed Core API
- `NEXT_PUBLIC_INTERNAL_API_KEY`: Same value as `INTERNAL_API_KEY` in Core API
- These are public vars (sent to browser), so protect your API endpoints separately

---

## 4. Deploying to Vercel (Frontends)

### 4.1 Prerequisites

- Vercel account (free tier works for small teams)
- Vercel CLI installed: `npm install -g vercel`
- Git repository pushed to GitHub/GitLab/Bitbucket

### 4.2 Deploy Customer Portal

**Option A: Via Vercel Dashboard (Recommended for non-technical CEOs)**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository `greenenergy-platform`
3. Configure project:
   - **Project Name**: `greenenergy-customer-portal`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/customer-portal`
   - **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/customer-portal`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install` (Vercel auto-detects `pnpm-lock.yaml`)
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://api-greenenergy.up.railway.app/api/v1`
5. Click **Deploy**

**Option B: Via CLI**

```bash
cd apps/customer-portal
vercel --prod
# Follow prompts, set root directory to `apps/customer-portal`
# Add env vars via `vercel env add NEXT_PUBLIC_API_BASE_URL production`
```

### 4.3 Deploy Internal Dashboard

Same steps as Customer Portal, but:

- **Project Name**: `greenenergy-internal-dashboard`
- **Root Directory**: `apps/internal-dashboard`
- **Build Command**: `cd ../.. && pnpm install && pnpm build --filter @greenenergy/internal-dashboard`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_BASE_URL` = `https://api-greenenergy.up.railway.app/api/v1`
  - `NEXT_PUBLIC_INTERNAL_API_KEY` = `your-secure-internal-api-key`

### 4.4 Custom Domains (Optional)

- In Vercel Dashboard → Project Settings → Domains
- Add your custom domain (e.g., `portal.greenenergy.com`)
- Follow DNS instructions to point domain to Vercel

---

## 5. Deploying to Railway (Backend + Database)

### 5.1 Prerequisites

- Railway account: [railway.app](https://railway.app)
- Railway CLI (optional): `npm install -g @railway/cli`

### 5.2 Deploy PostgreSQL Database

**Via Railway Dashboard:**

1. Create a new Project: "Green Energy Platform - Production"
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway will provision a PostgreSQL 15 instance and auto-generate `DATABASE_URL`
4. Note the connection string (visible in **Variables** tab)

### 5.3 Deploy Core API (NestJS)

**Via Railway Dashboard:**

1. In the same project, click **+ New** → **GitHub Repo**
2. Authorize Railway to access your `greenenergy-platform` repo
3. Select the repo and configure:
   - **Root Directory**: `apps/core-api` *(Railway supports monorepos)*
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Start Command**: Leave empty (Dockerfile's CMD is used)
4. Add Environment Variables (see section 3.1 above):
   - `NODE_ENV=production`
   - `PORT=3000` *(Railway will override with its own `PORT` if needed)*
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` *(Railway variable reference)*
   - `JOBNIMBUS_BASE_URL`, `JOBNIMBUS_API_KEY`, etc.
   - `QB_ENABLED`, `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REFRESH_TOKEN`, etc.
   - `PORTAL_BASE_URL`, `PORTAL_ORIGIN`, `INTERNAL_API_KEY`
5. Railway will auto-detect the Dockerfile and build
6. Once deployed, Railway assigns a public URL: `https://greenenergy-production.up.railway.app`
7. Update Vercel environment variables with this URL

**Via Railway CLI:**

```bash
railway login
railway init  # Link to existing project or create new
railway up    # Deploy from current directory (set root to apps/core-api)
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
# Add other env vars as needed
```

### 5.4 Run Database Migrations

**After first deployment:**

```bash
# Option A: Via Railway CLI (locally connected to Railway DB)
railway run npx prisma migrate deploy

# Option B: SSH into Railway service and run migration
railway run bash
npx prisma migrate deploy
exit
```

**Seed JobNimbus data (optional):**

```bash
railway run pnpm run seed:jobnimbus
```

---

## 6. External Integrations

### 6.1 JobNimbus API

**Setup:**

1. Obtain JobNimbus API key from your JobNimbus account settings
2. Set `JOBNIMBUS_API_KEY` in Core API environment variables
3. Enable sync: `JOBNIMBUS_SYNC_ENABLED=true`
4. Sync will run every 15 minutes (configurable via `JOBNIMBUS_SYNC_CRON`)

**Testing:**

- Check logs in Railway dashboard for sync success/failure
- Verify data in Internal Dashboard → Projects page

### 6.2 QuickBooks OAuth2

**Setup (Production):**

1. Create a QuickBooks app at [developer.intuit.com](https://developer.intuit.com)
2. Obtain `QB_CLIENT_ID` and `QB_CLIENT_SECRET`
3. Set up OAuth2 flow to get initial `QB_REFRESH_TOKEN`:
   - Use QuickBooks OAuth2 Playground or implement a temporary auth endpoint
   - After user authorizes, QuickBooks returns `access_token` + `refresh_token`
   - Store `refresh_token` securely as `QB_REFRESH_TOKEN` env var
4. Set `QB_REALM_ID` (your company's QuickBooks ID, visible in OAuth callback)
5. Enable integration: `QB_ENABLED=true`

**Automatic Token Refresh:**

- Core API automatically refreshes access tokens using `QB_REFRESH_TOKEN`
- Tokens are cached in memory with 5-minute safety margin
- No manual intervention needed for day-to-day operation

**Testing:**

- Profit Dashboard → Click "Sync All from QuickBooks"
- Check logs for `QuickBooks token refreshed successfully`
- Verify contract amounts appear in profit data

---

## 7. Rollout Strategy

### 7.1 Pre-Deployment Checklist

- [ ] All tests passing locally (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Database migrations tested in staging (if applicable)
- [ ] JobNimbus + QuickBooks credentials ready
- [ ] `INTERNAL_API_KEY` generated and stored securely

### 7.2 Initial Deployment

1. **Deploy Database (Railway)**
   - Create PostgreSQL instance
   - Note `DATABASE_URL`
2. **Deploy Core API (Railway)**
   - Link to GitHub repo
   - Set all environment variables
   - Deploy and run migrations
3. **Deploy Customer Portal (Vercel)**
   - Set `NEXT_PUBLIC_API_BASE_URL` to Railway API URL
   - Deploy
4. **Deploy Internal Dashboard (Vercel)**
   - Set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_INTERNAL_API_KEY`
   - Deploy
5. **Test End-to-End**
   - Visit Customer Portal, generate a magic link, verify login
   - Visit Internal Dashboard, check projects, profit dashboard, risk assessments
   - Trigger JobNimbus sync, verify data updates
   - Trigger QuickBooks sync, verify contract amounts populate

### 7.3 Post-Deployment

- Monitor Railway logs for errors
- Check Vercel logs for frontend issues
- Set up uptime monitoring (e.g., UptimeRobot, Railway health checks)
- Consider adding Sentry or LogRocket for error tracking

### 7.4 Updates & Rollbacks

**For Core API:**

- Push code to `main` branch → Railway auto-deploys
- Rollback: Railway Dashboard → Deployments → Redeploy previous version

**For Frontends (Vercel):**

- Push code to `main` → Vercel auto-deploys
- Rollback: Vercel Dashboard → Deployments → Promote previous deployment

---

## 8. Troubleshooting

### Issue: Vercel build fails with "Cannot find module"

**Solution**: Ensure `transpilePackages` in `next.config.js` includes all workspace packages:

```js
transpilePackages: ['@greenenergy/ui', '@greenenergy/shared-types']
```

### Issue: Railway "Cannot connect to database"

**Solution**: Verify `DATABASE_URL` is correctly set. Use Railway variable references: `${{Postgres.DATABASE_URL}}`

### Issue: Customer Portal shows "Network Error" when calling API

**Solution**: Check `NEXT_PUBLIC_API_BASE_URL` in Vercel env vars. Must include full URL with `/api/v1` path.

### Issue: QuickBooks sync fails with "Token refresh failed"

**Solution**:

- Verify `QB_REFRESH_TOKEN` is still valid (QuickBooks tokens expire after 100 days of inactivity)
- Re-authenticate via OAuth2 flow to get new refresh token
- Ensure `QB_CLIENT_ID` and `QB_CLIENT_SECRET` are correct

### Issue: "x-internal-api-key header missing" errors

**Solution**: Ensure `NEXT_PUBLIC_INTERNAL_API_KEY` in Internal Dashboard matches `INTERNAL_API_KEY` in Core API

---

## 9. Security Best Practices

- **Never commit `.env` files** to Git
- Use strong, random values for `INTERNAL_API_KEY` (32+ characters)
- Rotate API keys quarterly
- Restrict Railway/Vercel access to authorized team members only
- Enable 2FA on Vercel, Railway, GitHub accounts
- Use custom domains with HTTPS (automatic on Vercel/Railway)
- Monitor API logs for suspicious activity

---

## 10. Cost Estimates (As of 2025)

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| **Vercel** | Hobby (2 projects) | $0/month (up to 100GB bandwidth) |
| **Railway** | Starter | ~$5/month (PostgreSQL + API service) |
| **JobNimbus** | N/A (external) | Per JobNimbus subscription |
| **QuickBooks** | N/A (external) | Per QuickBooks subscription |
| **Total** | | ~$5–10/month for infrastructure |

**Notes:**

- Vercel Hobby tier is sufficient for small teams; upgrade to Pro ($20/month per seat) for production features like preview deployments, advanced analytics
- Railway charges per resource usage (CPU, memory, storage); estimate assumes light traffic

---

## 11. Staging Smoke Tests

**Phase 3 Sprint 8** introduced automated smoke tests for validating deployed environments.

After deployment, run smoke tests to verify critical endpoints and pages:

```bash
# Set environment variables (in .env or shell)
STAGING_CORE_API_BASE_URL=https://your-api.railway.app
STAGING_INTERNAL_DASHBOARD_BASE_URL=https://your-dashboard.vercel.app
STAGING_CUSTOMER_PORTAL_BASE_URL=https://your-portal.vercel.app
STAGING_INTERNAL_API_KEY=your-internal-api-key

# Run smoke tests
pnpm smoke:staging
```

See **[Staging Smoke Tests & Go-Live Checklist](./16-staging-smoke-tests-and-go-live-checklist.md)** and **[Release & Staging Playbook](./20-release-and-staging-playbook.md)** for:
- Complete go-live checklist
- Step-by-step deployment flow
- Smoke test details and customization
- Troubleshooting guide
- Manual verification checklist

---

## 12. Next Steps

After deployment is complete:

- **Phase 4 Sprint 1**: Advanced analytics dashboard
- **Phase 4 Sprint 2**: Mobile app (React Native)
- **Phase 4 Sprint 3**: Customer notifications system
- **Phase 4 Sprint 4**: Automated reporting

---

## Appendix: Useful Commands

### Local Development

```bash
# Start all services (requires separate terminals)
pnpm --filter @greenenergy/core-api dev
pnpm --filter @greenenergy/customer-portal dev
pnpm --filter @greenenergy/internal-dashboard dev

# Run tests
pnpm test

# Run migrations
pnpm --filter @greenenergy/db migrate:dev

# Seed JobNimbus data
pnpm --filter @greenenergy/core-api seed:jobnimbus
```

### Production Deployment

```bash
# Vercel (from repo root)
vercel --prod --cwd apps/customer-portal
vercel --prod --cwd apps/internal-dashboard

# Railway (from repo root)
railway up --service core-api
railway run npx prisma migrate deploy
```

---

**End of Deployment & Environments Guide**
