# Phase 3 Roadmap: Automation & Intelligence

**Goal**: Full automation, intelligent dispatching, finance integrations, forecasting, and advanced command center.

## Sprint 1: QuickBooks Accounting Integration ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ QuickBooks Online API client (read-only)
- ✅ Contract amount sync from QB invoices
- ✅ Accounting source tracking (PLACEHOLDER, QUICKBOOKS, MANUAL)
- ✅ JobFinancialSnapshot schema extensions
- ✅ AccountingService with sync endpoints
- ✅ ProfitabilityService respects QuickBooks data
- ✅ Profit Dashboard UI enhancements (source badges, sync buttons)
- ✅ Comprehensive test coverage (99 tests passing)
- ✅ Full documentation (docs/12-accounting-integration.md)

**Technical Details**:
- `POST /api/v1/accounting/jobs/:jobId/sync` - Sync single job
- `POST /api/v1/accounting/sync-all` - Batch sync all active jobs
- Job.jobNimbusId ↔ QuickBooks Invoice.DocNumber mapping
- Configurable via environment variables (QB_ENABLED, QB_COMPANY_ID, etc.)
- Error-resilient with graceful fallback to placeholder data

**Future Enhancements**:
- OAuth2 automatic token refresh
- Cost breakdown sync (labor, materials, permits)
- Multi-invoice support
- Webhook integration for real-time updates
- Xero and other accounting platforms

## Sprint 2: QuickBooks Reliability & Automation ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ OAuth2 automatic token refresh (QuickbooksAuthService)
- ✅ Token caching with expiry management
- ✅ Scheduled daily sync at 2 AM (@Cron)
- ✅ QB_SYNC_ENABLED feature flag
- ✅ "Sync All from QuickBooks" button in dashboard
- ✅ Per-job sync button (already in Sprint 1, verified)
- ✅ Comprehensive test coverage (10+ new test scenarios)
- ✅ Updated documentation

**Technical Details**:
- `QuickbooksAuthService.getAccessToken()` - automatic token refresh
- `AccountingTasks.handleDailyQuickbooksSync()` - scheduled sync job
- Token cache with 5-minute safety margin before expiry
- Fallback to `QB_ACCESS_TOKEN` if OAuth2 not configured
- Dashboard UI enhancements with loading states

**Environment Variables Added**:
```bash
QB_CLIENT_ID           # OAuth2 client ID
QB_CLIENT_SECRET       # OAuth2 client secret
QB_REFRESH_TOKEN       # Refresh token from initial OAuth flow
QB_TOKEN_URL           # OAuth token endpoint
QB_SYNC_ENABLED        # Enable/disable scheduled sync
```

**Benefits**:
- No manual token management after initial setup
- Automatic nightly sync keeps data fresh
- One-click batch sync from UI
- Improved reliability and user experience

## Sprint 3: Deployment & Environments ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ Comprehensive deployment documentation (docs/11-deployment-and-environments.md)
- ✅ Production-ready Dockerfile for core-api (multi-stage, Node 20 Alpine)
- ✅ .dockerignore for optimized Docker builds
- ✅ Consolidated .env.example at repo root (all services)
- ✅ .env.example for internal-dashboard
- ✅ Deployment guides for Vercel (frontends) and Railway (backend + DB)
- ✅ QuickBooks OAuth2 environment variables documented
- ✅ Architecture diagrams and rollout strategy
- ✅ Troubleshooting guide and security best practices

**Technical Details**:
- **Vercel**: Two projects for customer-portal and internal-dashboard
- **Railway**: NestJS API (Dockerized) + PostgreSQL 15
- **Health checks**: Built-in health endpoint for Railway monitoring
- **Environment variables**: Centralized documentation for all services
- **Monorepo support**: Optimized build commands for pnpm workspaces

**Environment Variables Documented**:
```bash
# Core API (15+ variables)
NODE_ENV, PORT, DATABASE_URL
JOBNIMBUS_*, PORTAL_*, INTERNAL_API_KEY
QB_ENABLED, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REFRESH_TOKEN, QB_REALM_ID, QB_BASE_URL

# Customer Portal
NEXT_PUBLIC_API_BASE_URL

# Internal Dashboard
NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_INTERNAL_API_KEY
```

**Deployment Options**:
- **Dashboard**: Click-and-deploy via Vercel/Railway web UI (non-technical CEO friendly)
- **CLI**: Vercel CLI and Railway CLI for power users
- **CI/CD**: Auto-deploy on Git push to main branch

**Cost Estimates**:
- Vercel Hobby: $0/month (2 projects)
- Railway Starter: ~$5/month (API + PostgreSQL)
- **Total**: ~$5-10/month for infrastructure

**Benefits**:
- Production-ready deployment strategy
- Clear step-by-step guides for non-technical stakeholders
- Scalable architecture (Vercel edge + Railway services)
- Secure environment variable management
- Easy rollback and update procedures

## Sprint 4: AI Workflow Automation Engine v1 ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ WorkflowActionLog Prisma model with composite index
- ✅ 8 workflow rules across 6 departments (SALES, PRODUCTION, ADMIN, SAFETY, WARRANTY, FINANCE)
- ✅ Deduplication logic with configurable cooldown periods
- ✅ JobNimbus task/note creation integration
- ✅ Daily cron job at 4 AM (WORKFLOW_AUTOMATION_ENABLED)
- ✅ 4 internal API endpoints (rules, logs, run-job, run-all)
- ✅ Comprehensive test coverage (9 new tests, 119 total passing)
- ✅ Full documentation (docs/13-workflow-automation.md)

**Workflow Rules Implemented**:
1. **SALES_ESTIMATE_FOLLOWUP_72H** - Follow up on stale estimates (7-day cooldown)
2. **PRODUCTION_QC_FAIL_NEEDS_PHOTOS** - QC failures missing photos (3-day cooldown)
3. **PRODUCTION_MATERIAL_DELAY** - Late material orders (2-day cooldown)
4. **ADMIN_SUB_NONCOMPLIANT_ASSIGNED** - Non-compliant subcontractors (1-day cooldown)
5. **SAFETY_OPEN_HIGH_SEVERITY_INCIDENT** - High/critical safety incidents (1-day cooldown)
6. **WARRANTY_EXPIRING_SOON** - Warranties expiring within 30 days (14-day cooldown)
7. **FINANCE_LOW_MARGIN_HIGH_RISK_JOB** - Low margin + high risk jobs (7-day cooldown)
8. **FINANCE_MISSING_CONTRACT_AMOUNT** - Active jobs missing contract amounts (5-day cooldown)

**Technical Details**:
- Rules-based system (no LLM in v1) for deterministic, testable automation
- Processes 500 jobs in <30 seconds
- Error isolation (one rule failure doesn't affect others)
- Sequential execution to avoid JobNimbus API rate limits
- Extensible architecture for future LLM integration

**API Endpoints**:
- `GET /api/v1/workflows/rules` - List all workflow rules
- `GET /api/v1/workflows/logs` - Get recent action logs with filters
- `POST /api/v1/workflows/jobs/:jobId/run` - Run workflows for single job
- `POST /api/v1/workflows/run-all` - Run workflows for all active jobs

**Benefits**:
- Reduced manual follow-up work
- Proactive alerts for non-compliant subcontractors and safety incidents
- Financial oversight for low-margin high-risk jobs
- Warranty expiration outreach for customer retention
- Automatic reminders for stale estimates and late materials

## Sprint 5: Workflow Automation Dashboard & Observability ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ `/workflows` page in internal-dashboard (Next.js App Router)
- ✅ Workflow Rules Summary table (department badges, descriptions, keys, status)
- ✅ Recent Actions table with filtering (Job ID, Rule, Limit)
- ✅ Manual execution controls ("Run All Workflows" button, "Run for Job" input)
- ✅ Real-time result feedback (success/error messages with action counts)
- ✅ Integration with core-api workflow endpoints
- ✅ Updated documentation (docs/13-workflow-automation.md)

**Dashboard Features**:

1. **Rules Summary**:
   - Department badge (color-coded: SALES, PRODUCTION, ADMIN, SAFETY, WARRANTY, FINANCE)
   - Rule name and description
   - Rule key (monospace)
   - Enabled/Disabled status

2. **Recent Actions Table**:
   - Timestamp (formatted)
   - Job ID (clickable link to risk view)
   - Rule key
   - Department badge
   - Action type badge (Task/Note/Flag)
   - Metadata snippet
   - Empty state message when no actions recorded

3. **Filtering**:
   - Job ID text input
   - Rule dropdown (all rules + "All Rules")
   - Limit selector (25/50/100)
   - Auto-refresh on filter change

4. **Manual Execution**:
   - "Run All Workflows" button (header)
   - "Run for Job" panel with Job ID input
   - Loading states and result feedback
   - Auto-refresh logs after execution

**Technical Details**:
- Client-side React with Next.js App Router
- API integration via `NEXT_PUBLIC_INTERNAL_API_KEY`
- State management with React hooks (useState, useEffect)
- Tailwind CSS with `@greenenergy/ui` components
- Full TypeScript with `@greenenergy/shared-types`

**Benefits**:
- Operations visibility into workflow automation
- Ability to manually trigger workflows for testing/debugging
- Filter logs to investigate specific jobs or rules
- Real-time feedback on workflow execution results
- Foundation for future analytics dashboard

## Sprint 6: Command Center & Role-Based Dashboards ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ Command Center API endpoints (`/overview`, `/jobs-needing-attention`)
- ✅ CommandCenter DTOs in shared-types
- ✅ Internal dashboard `/command-center` page
- ✅ Role-based metric groupings (Executive, Production, Safety, Finance)
- ✅ Jobs needing attention table with multi-factor flagging
- ✅ Workflow activity snapshot with link to `/workflows`
- ✅ Unit tests for CommandCenterService (4 test scenarios)
- ✅ Comprehensive documentation (docs/14-command-center-and-role-dashboards.md)

**Features**:

1. **Summary Metrics**:
   - Jobs in progress (not CANCELLED or COMPLETE)
   - High-risk jobs (HIGH risk level)
   - Scheduling risk (HIGH scheduling risk)
   - Open safety incidents
   - Subcontractor performance distribution (GREEN/YELLOW/RED)
   - Warranties expiring soon (within 30 days)
   - Material orders delayed (past expected delivery)
   - Low-margin high-risk jobs (<10% margin + HIGH risk)
   - Workflow automation actions (last 24h)

2. **Role Views**:
   - **Executive**: Total jobs, jobs in progress, high-risk jobs, avg margin %
   - **Production**: QC issues, delayed materials, scheduling risk
   - **Safety**: Open incidents, high severity incidents, incidents (last 30 days)
   - **Finance**: Low-margin jobs, low-margin + high-risk, total contract amount

3. **Jobs Needing Attention**:
   - Multi-factor flagging (QC, Safety, Materials, Warranty, Finance)
   - Risk level badges (LOW/MEDIUM/HIGH)
   - Deep links to `/risk/[jobId]` detail view
   - Empty state when no jobs need attention
   - Limited to 100 most recent jobs for performance

4. **Dashboard Features**:
   - Server-side rendered Next.js page
   - Real-time data (no caching)
   - Responsive grid layout (mobile-friendly)
   - Color-coded metrics (red for high-risk, amber for warnings, green for positive)
   - Workflow activity snapshot with link to `/workflows`
   - Graceful error handling

**Technical Details**:
- `GET /api/v1/command-center/overview` - Complete overview
- `GET /api/v1/command-center/jobs-needing-attention` - Jobs list only
- Authentication: `InternalApiKeyGuard` (x-internal-api-key header)
- Performance: <2s response time for full overview
- Prisma aggregate queries (optimized for 500-1000 active jobs)
- No circular dependencies (direct Prisma queries, no service injection)

**Benefits**:
- Unified operational overview for all stakeholders
- Quick identification of jobs requiring immediate attention
- Role-specific metric groupings for targeted insights
- Real-time visibility into workflow automation activity
- Foundation for future time-series and predictive analytics

## Sprint 7: Intelligent Dispatching (Future)

- AI-driven crew scheduling
- Route optimization
- Skills-based matching
- Real-time dispatch adjustments

## Sprint 7: Forecasting & Analytics (Future)

- Job completion date predictions
- Resource demand forecasting
- Revenue projections
- Trend analysis and insights

## Sprint 8: Command Center v2 (Future)

- Real-time operations dashboard
- Multi-team coordination
- Performance analytics
- Executive reporting and KPIs

**Note**: Phase 3 will be refined based on Phase 1 and Phase 2 outcomes and business priorities.
