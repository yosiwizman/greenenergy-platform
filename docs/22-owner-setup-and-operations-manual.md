# Owner Setup & Operations Manual (GreenEnergy Platform)

**Audience**: This guide is written for a **non-technical owner/operator**. **No coding or CLI is required.**

If you are an engineer and need deeper implementation details, see:
- [11. Deployment & Environments](./11-deployment-and-environments.md)
- [12. Accounting & QuickBooks Integration](./12-accounting-integration.md)
- [15. Customer Experience Engine](./15-customer-experience-engine.md)
- [18. Executive Weekly Digest & Reporting](./18-executive-digest-and-reporting.md)
- [19. Production Readiness & Observability](./19-production-readiness-and-observability.md)
- [20. Release & Staging Playbook](./20-release-and-staging-playbook.md)
- [21. LLM Integration (AI Ops & CX)](./21-llm-integration-ai-ops-and-cx.md)

---

## Section A – High-Level Overview

### A.1 What you’re operating
GreenEnergy Platform has:
- A **Core API** (the backend) that connects to external providers.
- An **Internal Dashboard** (for staff) where you monitor ops, finance, risk, and AI tools.
- A **Customer Portal** (for homeowners) where customers can view status and updates.

### A.2 Where things run (hosting)
- **Railway** hosts:
  - Core API (NestJS)
  - PostgreSQL database
- **Vercel** hosts:
  - Internal Dashboard (Next.js)
  - Customer Portal (Next.js)

This architecture is described in detail in [docs/11](./11-deployment-and-environments.md).

### A.3 Environments (Staging vs Production)
- **Staging**: safe testing environment; validate changes and integrations.
- **Production**: live environment.

Best practice is to configure providers in **staging first**, validate with smoke tests + dashboard checks, then mirror into production. See [docs/20](./20-release-and-staging-playbook.md).

### A.4 What you should look at day-to-day
Internal Dashboard pages you’ll use most often:
- `/ops` – platform health and cron freshness
- `/command-center` – business/ops overview
- `/finance` – Accounts Receivable (AR), overdue payments
- `/risk` and `/qc` – operational risk and QC checks
- `/exec-report` – executive weekly digest preview + send
- `/ai-ops` – AI Ops assistant (LLM-assisted job summary + message drafts)
- `/llm-usage` – LLM usage monitoring (volume/fallback/errors/cost estimate)

(See [docs/19](./19-production-readiness-and-observability.md) for observability endpoints and dashboards.)

---

## Section B – Accounts You Need to Create

Create these accounts (or ensure you have admin access). This is the “owner checklist”.

| Done | Account / Provider | Why you need it | What you’ll do with it |
|------|--------------------|-----------------|------------------------|
| [ ] | GitHub (repo access) | Source control + CI smoke tests | View PRs, check CI runs, run “Staging Smoke Tests” workflow ([docs/20](./20-release-and-staging-playbook.md)) |
| [ ] | Railway | Host Core API + Postgres | Set Core API environment variables, view logs, manage database |
| [ ] | Vercel | Host Internal Dashboard + Customer Portal | Set frontend env vars, view deployments |
| [ ] | JobNimbus | Operational system of record | Generate API key for sync; (optional) embed panels |
| [ ] | Intuit Developer | Required for QuickBooks OAuth app | Create QuickBooks app to obtain Client ID/Secret |
| [ ] | QuickBooks Online | Accounting + AR source | Provide Realm/Company ID + refresh token; validate AR dashboards |
| [ ] | Resend | Transactional email delivery | Send executive digest and customer emails ([docs/15](./15-customer-experience-engine.md), [docs/18](./18-executive-digest-and-reporting.md)) |
| [ ] | Twilio | Transactional SMS delivery (optional) | Enable SMS reminders (requires Twilio vars + feature flag) ([docs/15](./15-customer-experience-engine.md), [docs/12](./12-accounting-integration.md)) |
| [ ] | OpenAI | LLM provider (optional/controlled) | Enable AI Ops + CX draft generation + monitor usage ([docs/21](./21-llm-integration-ai-ops-and-cx.md)) |
| [ ] | Domain/DNS provider (optional) | Custom domains | Point domains to Vercel/Railway for production |

---

## Section C – Environments & Secrets (No CLI)

### C.1 Staging vs Production (recommended setup)
You typically have **two sets** of hosting projects:
- Railway Project: `Green Energy Platform - Staging`
- Vercel Projects:
  - `greenenergy-internal-dashboard-staging`
  - `greenenergy-customer-portal-staging`

…and the same pattern for Production.

### C.2 Railway Variables (Core API) – what to set
In Railway:
1. Open your Railway Project
2. Click the **Core API** service
3. Go to **Variables**
4. Add/update the variables below

Important concepts:
- **Secrets belong in Railway** (server-side). Do not paste provider secrets into Vercel.
- Railway’s Postgres plugin **auto-provides** `DATABASE_URL`.

**Core platform**
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `NODE_ENV` | Yes | Use `production` for staging/prod builds |
| `DATABASE_URL` | Yes (auto) | Database connection (Railway injects) |
| `INTERNAL_API_KEY` | Yes | Shared key used by Internal Dashboard + smoke tests to call protected endpoints |
| `PORTAL_BASE_URL` | Yes | Customer Portal base URL (used by portal flows) |
| `PORTAL_ORIGIN` | Yes | Customer Portal origin (same as portal base URL) |

**JobNimbus (data sync)** (see [docs/11](./11-deployment-and-environments.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `JOBNIMBUS_BASE_URL` | Yes | Usually `https://api.jobnimbus.com` |
| `JOBNIMBUS_API_KEY` | Yes | JobNimbus API key |
| `JOBNIMBUS_SYNC_ENABLED` | Recommended | Enable scheduled sync (`true`/`false`) |
| `JOBNIMBUS_SYNC_CRON` | Optional | Default runs every 15 minutes |

**QuickBooks (Finance & AR)** (see [docs/12](./12-accounting-integration.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `QB_ENABLED` | Optional | `true` to enable QuickBooks integration |
| `QB_BASE_URL` | If enabled | Usually `https://quickbooks.api.intuit.com` |
| `QB_COMPANY_ID` | If enabled | QuickBooks Realm/Company ID |
| `QB_CLIENT_ID` | If enabled | OAuth client ID |
| `QB_CLIENT_SECRET` | If enabled | OAuth client secret |
| `QB_REFRESH_TOKEN` | If enabled | OAuth refresh token (one-time setup, then auto-refresh) |
| `QB_TOKEN_URL` | If enabled | Usually `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |
| `QB_SYNC_ENABLED` | Optional | Enables daily scheduled QB sync (recommended when live) |

**Email (Resend)** (see [docs/15](./15-customer-experience-engine.md), [docs/18](./18-executive-digest-and-reporting.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `NOTIFICATIONS_EMAIL_PROVIDER` | If using email | Set to `resend` |
| `RESEND_API_KEY` | If using email | Resend API key |
| `NOTIFICATIONS_FROM_EMAIL` | If using email | Verified sender address |

**SMS (Twilio) – optional** (see [docs/15](./15-customer-experience-engine.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `NOTIFICATIONS_SMS_PROVIDER` | If using SMS | Set to `twilio` |
| `TWILIO_ACCOUNT_SID` | If using SMS | Twilio credential |
| `TWILIO_AUTH_TOKEN` | If using SMS | Twilio credential |
| `TWILIO_FROM_NUMBER` | If using SMS | Twilio phone number (E.164) |
| `ENABLE_PAYMENT_REMINDER_SMS` | Optional | Enables SMS alongside payment reminder workflows |

**Executive Weekly Digest** (see [docs/18](./18-executive-digest-and-reporting.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `EXEC_DIGEST_RECIPIENTS` | Recommended | Comma-separated recipient emails |

**LLM (OpenAI) – optional, controlled rollout** (see [docs/21](./21-llm-integration-ai-ops-and-cx.md))
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `LLM_PROVIDER` | If using LLM | Set to `openai` |
| `LLM_MODEL` | If using LLM | Default: `gpt-4o-mini` |
| `LLM_API_KEY` | If using LLM | OpenAI API key |
| `ENABLE_LLM_FOR_AI_OPS` | Optional | Enables AI Ops summaries |
| `ENABLE_LLM_FOR_CX_MESSAGES` | Optional | Enables AI-assisted CX message drafts |

**Embedded panels inside JobNimbus (optional)**
If you want QC/Risk/Portal previews inside JobNimbus, also set:
- `INTERNAL_DASHBOARD_BASE_URL` (your Internal Dashboard URL)
- `EMBED_SIGNING_SECRET` (strong random secret; required for production)
- `EMBED_TOKEN_TTL_MINUTES` (optional)

For details see JobNimbus embed docs: [docs/05 – Embedded Panels](./05-jobnimbus-integration.md#embedded-panels-for-jobnimbus).

**Note about the `/ops` page**
The `/ops` page is a lightweight, config-based health dashboard ([docs/19](./19-production-readiness-and-observability.md)). Some checks may appear **DOWN** if optional services are not configured.

---

### C.3 Vercel Environment Variables (Internal Dashboard + Customer Portal)
In Vercel, open each project → **Settings** → **Environment Variables**.

**Customer Portal (Vercel)**
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Core API base URL including `/api/v1` |

**Internal Dashboard (Vercel)**
| Variable | Required | What it’s for |
|----------|----------|---------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Core API base URL including `/api/v1` |
| `NEXT_PUBLIC_INTERNAL_API_KEY` | Yes | Must match Railway `INTERNAL_API_KEY` |

**Important**: Do **not** put provider secrets (OpenAI, QuickBooks, JobNimbus, Resend, Twilio) into Vercel env vars. Those should remain in Railway.

### C.4 GitHub Secrets for Staging Smoke Tests
Smoke tests validate deployed staging from GitHub Actions (no local CLI needed).

In GitHub:
1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets (see [docs/20](./20-release-and-staging-playbook.md)):

| Secret name | What it should contain |
|------------|-------------------------|
| `STAGING_CORE_API_BASE_URL` | Core API base URL (no `/api/v1`) |
| `STAGING_INTERNAL_DASHBOARD_BASE_URL` | Internal Dashboard base URL |
| `STAGING_CUSTOMER_PORTAL_BASE_URL` | Customer Portal base URL |
| `STAGING_INTERNAL_API_KEY` | Same as `INTERNAL_API_KEY` |

Then go to **Actions** → **Staging Smoke Tests** → **Run workflow**.

---

## Section D – Connecting Each Major Feature

### D.1 JobNimbus Sync & Embedded Panels
**Goal**: Jobs, contacts, photos sync into the platform; optional embedded views inside JobNimbus.

1. In JobNimbus, generate an API key.
2. In Railway (Core API), set:
   - `JOBNIMBUS_BASE_URL=https://api.jobnimbus.com`
   - `JOBNIMBUS_API_KEY=...`
   - `JOBNIMBUS_SYNC_ENABLED=true`
3. Validate:
   - Open Internal Dashboard `/command-center` and confirm data loads.
   - In Railway, check Core API logs for JobNimbus sync activity.

**Embedded Panels (optional)**
- The platform supports embed pages:
  - QC: `/embed/qc?token=...`
  - Risk: `/embed/risk?token=...`
  - Portal preview: `/embed/portal?token=...`
- Embed links are **time-limited** and require a signed token.

If you want embeds inside JobNimbus, ensure Core API has:
- `INTERNAL_DASHBOARD_BASE_URL` set to the internal dashboard URL
- `EMBED_SIGNING_SECRET` set to a strong secret

Then an engineer/admin can generate embed links via the protected endpoint described in [docs/05](./05-jobnimbus-integration.md#embedded-panels-for-jobnimbus).

### D.2 QuickBooks Finance & AR
**Goal**: Finance dashboards reflect real invoices/payments and AR status.

1. Create an Intuit Developer app and obtain:
   - `QB_CLIENT_ID`
   - `QB_CLIENT_SECRET`
2. Perform the one-time OAuth flow to obtain:
   - `QB_REFRESH_TOKEN`
   - `QB_COMPANY_ID` (QuickBooks Realm/Company ID)
   See [docs/11](./11-deployment-and-environments.md) and [docs/12](./12-accounting-integration.md) for the recommended approach.
3. In Railway (Core API), set:
   - `QB_ENABLED=true`
   - `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REFRESH_TOKEN`, `QB_COMPANY_ID`
4. Validate in Internal Dashboard:
   - `/finance` (AR summary + aging)
   - `/profit` (profit indicators)
   - `/exec-report` (digest includes finance)

If QuickBooks is not configured, finance dashboards may show placeholder/empty values.

### D.3 Resend (Email)
**Goal**: The platform can send executive digest emails and customer emails.

1. Create a Resend account and verify your sending domain.
2. Create an API key in Resend.
3. In Railway (Core API), set:
   - `NOTIFICATIONS_EMAIL_PROVIDER=resend`
   - `RESEND_API_KEY=...`
   - `NOTIFICATIONS_FROM_EMAIL=no-reply@yourdomain.com`
4. Validate:
   - Open Internal Dashboard `/exec-report`
   - Click **Send Digest Email Now**
   - Confirm the email arrives to addresses listed in `EXEC_DIGEST_RECIPIENTS`

See [docs/15](./15-customer-experience-engine.md) and [docs/18](./18-executive-digest-and-reporting.md).

### D.4 Twilio (SMS) – optional
**Goal**: Enable SMS reminders (primarily used for payment reminder workflows).

1. Create a Twilio account and obtain:
   - Account SID
   - Auth token
   - A sending phone number (E.164 format)
2. In Railway (Core API), set:
   - `NOTIFICATIONS_SMS_PROVIDER=twilio`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
3. (Optional) enable SMS reminders:
   - `ENABLE_PAYMENT_REMINDER_SMS=true`

See [docs/15](./15-customer-experience-engine.md) and the payment reminder flow in [docs/12](./12-accounting-integration.md).

### D.5 OpenAI LLM (AI Ops & CX drafts) + verify `/llm-usage`
**Goal**: Enable safe, operator-reviewed AI summaries and message drafts.

1. Create an OpenAI account and generate an API key.
2. In Railway (Core API), set:
   - `LLM_PROVIDER=openai`
   - `LLM_MODEL=gpt-4o-mini`
   - `LLM_API_KEY=...`
3. Start with a controlled rollout:
   - `ENABLE_LLM_FOR_AI_OPS=true` (staging first)
   - `ENABLE_LLM_FOR_CX_MESSAGES=false` until validated
4. Validate:
   - Internal Dashboard `/ai-ops`: generate an AI summary and confirm you see the model + fallback indicator.
   - Internal Dashboard `/llm-usage`: confirm calls are being logged (volume, fallback, errors, rough cost).

See [docs/21](./21-llm-integration-ai-ops-and-cx.md) and the monitoring section in [docs/19](./19-production-readiness-and-observability.md).

---

## Section E – Daily/Weekly Operating Checklist

### Daily (5–10 minutes)
- Internal Dashboard `/ops`
  - Core API: UP
  - Database: UP
  - Cron timestamps: not stale
- Internal Dashboard `/command-center`
  - Check high-risk jobs, safety incidents, overdue AR count
- Internal Dashboard `/finance`
  - Review overdue balances and aging buckets
- Internal Dashboard `/risk` and `/qc`
  - Spot-check the top problem jobs
- If LLM is enabled: `/llm-usage`
  - Watch error rate and fallback rate

### Weekly (15–30 minutes)
- Internal Dashboard `/exec-report`
  - Preview weekly digest; send if needed
- GitHub → Actions → “Staging Smoke Tests”
  - Run workflow and confirm all checks pass ([docs/20](./20-release-and-staging-playbook.md))
- Customer Portal
  - Open the portal root URL and verify it loads

---

## Section F – Troubleshooting Map

Use this map to quickly identify where to look. If an item persists >30 minutes, involve your engineering operator.

### F.1 Internal Dashboard won’t load / shows errors
Quick checks:
- Vercel env vars set?
  - `NEXT_PUBLIC_API_BASE_URL` correct (must end with `/api/v1`)
  - `NEXT_PUBLIC_INTERNAL_API_KEY` matches Railway `INTERNAL_API_KEY`
- Core API reachable in browser?
- Check Vercel deployment logs

Deep dive:
- [docs/11 Deployment & Environments](./11-deployment-and-environments.md)
- [docs/20 Release & Staging Playbook](./20-release-and-staging-playbook.md)

### F.2 `/ops` shows issues
Quick checks:
- If **Core API** or **Database** is DOWN: check Railway status/logs immediately.
- If an external service is DOWN:
  - It may be optional (email/SMS/QuickBooks in staging)
  - Confirm corresponding Railway variables are set

Deep dive:
- [docs/19 Production Readiness & Observability](./19-production-readiness-and-observability.md)

### F.3 Finance/AR looks wrong or empty
Quick checks:
- Is QuickBooks enabled (`QB_ENABLED=true`)?
- Are OAuth variables present (`QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REFRESH_TOKEN`, `QB_COMPANY_ID`)?
- Check Railway logs for QuickBooks sync errors

Deep dive:
- [docs/12 Accounting & QuickBooks](./12-accounting-integration.md)

### F.4 Executive digest not sending
Quick checks:
- Are Resend variables present (`RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`)?
- Are recipients configured (`EXEC_DIGEST_RECIPIENTS`)?
- Use Internal Dashboard `/exec-report` → “Send Digest Email Now” and check error banner

Deep dive:
- [docs/18 Executive Digest](./18-executive-digest-and-reporting.md)
- [docs/15 CX Engine (Email)](./15-customer-experience-engine.md)

### F.5 LLM features always show fallback / AI tools not working
Quick checks:
- Are LLM variables present (`LLM_PROVIDER`, `LLM_API_KEY`)?
- Are the feature toggles enabled (`ENABLE_LLM_FOR_AI_OPS`, `ENABLE_LLM_FOR_CX_MESSAGES`)?
- Check `/llm-usage` for errors and recent calls

Deep dive:
- [docs/21 LLM Integration](./21-llm-integration-ai-ops-and-cx.md)
- [docs/19 Observability (LLM usage console)](./19-production-readiness-and-observability.md)

### F.6 Smoke tests failing in GitHub Actions
Quick checks:
- Are GitHub secrets set correctly?
- Do the base URLs point to the right environment?
- Is `STAGING_INTERNAL_API_KEY` correct?

Deep dive:
- [docs/20 Release & Staging Playbook](./20-release-and-staging-playbook.md)

---

**End of Owner Manual**