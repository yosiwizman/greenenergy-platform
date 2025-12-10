# Green Energy Platform

A professional TypeScript monorepo for managing solar installation operations with JobNimbus integration, advanced QC, risk management, and operational intelligence.

## 🏗️ Project Structure

This is a **pnpm + Turborepo monorepo** containing:

### Applications

- **`apps/core-api`** - NestJS backend API with JobNimbus sync engine
- **`apps/customer-portal`** - Next.js 14 customer-facing portal with magic link auth
- **`apps/internal-dashboard`** - Next.js 14 operations dashboard

### Packages

- **`packages/db`** - Prisma ORM + PostgreSQL schema (12 models)
- **`packages/jobnimbus-sdk`** - Typed JobNimbus API client
- **`packages/shared-types`** - Domain types and interfaces
- **`packages/ui`** - Shared React component library (Tailwind + shadcn/ui)
- **`packages/config`** - Centralized ESLint, Prettier, TypeScript, and Tailwind configs

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **pnpm 9+**
- **Docker** (for PostgreSQL)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd greenenergy-platform

# Install dependencies
pnpm install
```

### Database Setup

```bash
# Start PostgreSQL container
docker-compose -f infra/docker/docker-compose.yml up -d

# Generate Prisma client
pnpm --filter @greenenergy/db db:generate

# Run database migrations
pnpm --filter @greenenergy/db db:migrate
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Or run individual apps:
pnpm --filter @greenenergy/core-api dev          # Backend API on port 3000
pnpm --filter @greenenergy/customer-portal dev    # Customer portal on port 3001
pnpm --filter @greenenergy/internal-dashboard dev # Internal dashboard on port 3002
```

### Build

```bash
# Build all apps and packages
pnpm build

# Or build individual packages/apps:
pnpm --filter @greenenergy/shared-types build
pnpm --filter @greenenergy/ui build
pnpm --filter @greenenergy/core-api build
```

## 📝 Scripts

### Root Level

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps and packages
pnpm lint         # Lint all code
pnpm test         # Run all tests
pnpm format       # Format code with Prettier
pnpm typecheck    # Type-check all TypeScript code
```

### Package-Specific

```bash
# Database
pnpm --filter @greenenergy/db db:generate     # Generate Prisma client
pnpm --filter @greenenergy/db db:migrate      # Run migrations
pnpm --filter @greenenergy/db db:studio       # Open Prisma Studio

# Core API
pnpm --filter @greenenergy/core-api dev       # Start backend
pnpm --filter @greenenergy/core-api build     # Build backend
pnpm --filter @greenenergy/core-api test      # Run backend tests

# Customer Portal
pnpm --filter @greenenergy/customer-portal dev
pnpm --filter @greenenergy/customer-portal build

# Internal Dashboard
pnpm --filter @greenenergy/internal-dashboard dev
pnpm --filter @greenenergy/internal-dashboard build
```

## 🗄️ Database

PostgreSQL database managed by Prisma ORM.

**Connection String** (local dev):

```
postgresql://postgres:postgres@localhost:5432/greenenergy?schema=public
```

**Models**: Job, Contact, JobSyncLog, PhotoMetadata, QCPhotoCheck, JobRiskSnapshot, RiskFlag, CustomerUser, Subcontractor, SafetyIncident, Warranty, MaterialOrder, SystemConfig

## 🔧 Configuration

### Environment Variables

#### `apps/core-api/.env`

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/greenenergy?schema=public"
JOBNIMBUS_API_URL="https://app.jobnimbus.com/api/v1"
JOBNIMBUS_API_KEY="your_api_key_here"
```

See `.env.example` files in each app for full configuration.

## 🔗 JobNimbus Integration & Sync

The platform includes a complete JobNimbus integration with bi-directional sync:

**Package**: `packages/jobnimbus-sdk` - Typed JobNimbus API client with comprehensive HTTP methods

**Core API Endpoints**:

- `POST /api/v1/sync/jobs` - Manual job sync
- `POST /api/v1/sync/contacts` - Manual contact sync
- `POST /api/v1/sync/photos` - Manual photo sync (single job or all jobs)
- `GET /api/v1/sync/summary` - Last sync status
- `GET /api/v1/integration/jobnimbus/health` - API health check
- `POST /api/v1/qc/jobs/:id/evaluate` - Evaluate QC for a job
- `GET /api/v1/qc/jobs/:id` - Get QC result for a job
- `GET /api/v1/qc/jobs` - Get QC overview for all jobs
- `POST /api/v1/risk/jobs/:id/evaluate` - Evaluate risk for a job
- `GET /api/v1/risk/jobs/:id` - Get risk snapshot for a job
- `GET /api/v1/risk/jobs` - Get all risk snapshots

**Features**:

- ✅ Real HTTP calls with `axios` (no mocks)
- ✅ Pagination support for large datasets
- ✅ Error handling (auth, rate limits, network)
- ✅ Scheduled sync (cron job every 15 min, configurable)
- ✅ Manual triggers via REST API
- ✅ Comprehensive unit tests with `nock`
- ✅ Seed script for initial data import

### Setup

1. **Configure environment variables** (see `.env.example` files):

```env
JOBNIMBUS_BASE_URL="https://api.jobnimbus.com"
JOBNIMBUS_API_KEY="your_api_key_here"
JOBNIMBUS_SYNC_CRON="*/15 * * * *"  # Every 15 minutes
JOBNIMBUS_SYNC_ENABLED="true"
```

2. **Import initial data**:

```bash
pnpm seed:jobnimbus
```

3. **Start the API**:

```bash
pnpm --filter @greenenergy/core-api dev
```

See **[JobNimbus Integration Guide](docs/05-jobnimbus-integration.md)** for full documentation.

## 🏠 Customer Portal v1

Secure, magic-link authenticated customer portal for tracking solar installation projects.

**Features**:

- ✅ Magic link authentication (7-day session expiry)
- ✅ Real-time project status timeline
- ✅ Installation photos (Before/During/After)
- ✅ Project documents (Contracts, Permits, Warranties)
- ✅ Mobile-responsive design
- ✅ Powered by real data from core API

**API Endpoints**:

- `POST /api/v1/portal/magic-link` - Generate magic link for customer
- `GET /api/v1/portal/session/resolve` - Validate authentication token
- `GET /api/v1/portal/jobs/:jobId` - Fetch job view for authenticated session

**Environment Variables** (apps/core-api):

```env
PORTAL_BASE_URL="http://localhost:3001"
PORTAL_ORIGIN="http://localhost:3001"
PORTAL_SESSION_TTL_DAYS="7"
INTERNAL_API_KEY="your-internal-api-key-here"
```

**Environment Variables** (apps/customer-portal):

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api/v1"
```

**Generating a Magic Link** (for testing):

```bash
curl -X POST http://localhost:3000/api/v1/portal/magic-link \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-internal-api-key-here" \
  -d '{"jobId": "<job-id>", "email": "customer@example.com"}'
```

The response contains a `url` field with the magic link to send to customers.

## 🚨 Risk Dashboard v1

Operational risk dashboard for identifying and managing problem jobs.

**Features**:

- ✅ Rule-based risk evaluation (stuck status, missing QC, stale jobs)
- ✅ Configurable thresholds (7/14 day defaults)
- ✅ Risk levels: LOW/MEDIUM/HIGH based on severity
- ✅ Persistent risk snapshots stored in database
- ✅ Deep links to JobNimbus for external actions
- ✅ Internal links to QC and job details

**Risk Rules**:

1. **STUCK_IN_STATUS**: Job stuck in current status >= 7/14 days
2. **MISSING_QC_PHOTOS**: Failed QC check due to missing photos
3. **STALE_JOB**: Job not updated >= 7/14 days
4. **MISSING_DOCUMENTS**: (Placeholder for future implementation)

**API Endpoints**:

- `POST /api/v1/risk/jobs/:id/evaluate` - Evaluate risk for a job
- `POST /api/v1/risk/evaluate-all` - Evaluate risk for all jobs
- `GET /api/v1/risk/jobs/:id` - Get risk snapshot for a job
- `GET /api/v1/risk/jobs` - Get all risk snapshots

**Dashboard Routes**:

- `/risk` - Overview table of all jobs with risk levels, issues, and actions
- `/risk/[jobId]` - Detail page with risk reasons, severity badges, and navigation

**Configuration**:

```env
# Optional: Override default thresholds
RISK_STUCK_STATUS_DAYS_MEDIUM=7
RISK_STUCK_STATUS_DAYS_HIGH=14
RISK_STALE_JOB_DAYS_MEDIUM=7
RISK_STALE_JOB_DAYS_HIGH=14
JOBNIMBUS_APP_BASE_URL="https://app.jobnimbus.com"
```

## 👷 Subcontractor Management

Phase 2 Sprint 1 introduced a comprehensive subcontractor management system with automated compliance tracking, performance scoring, and job assignment guards.

**Features**:

- ✅ Subcontractor directory with contact and licensing information
- ✅ Automated compliance monitoring (license, insurance, W9, COI)
- ✅ Performance scoring (0-100) based on QC failures and safety incidents
- ✅ Job assignment with compliance guard (blocks non-compliant assignments)
- ✅ JobNimbus integration for non-compliance alerts (notes + tasks)
- ✅ Internal dashboard with list and detail views

**Compliance Rules**:

A subcontractor is compliant only if ALL four criteria are met:
1. Valid license (present and not expired)
2. Valid insurance (present and not expired)
3. W9 received
4. COI received

When a subcontractor becomes non-compliant, the system automatically creates JobNimbus notes and tasks on all active jobs assigned to that subcontractor.

**Performance Scoring**:

- Starting score: 100 points
- QC failures: -5 points each
- Safety incidents: -10 points each
- Status mapping: >=85 GREEN, 70-84 YELLOW, <70 RED

**API Endpoints**:

```
GET    /api/v1/subcontractors                          # List with filters
GET    /api/v1/subcontractors/:id                      # Get single subcontractor
POST   /api/v1/subcontractors                          # Create subcontractor
PATCH  /api/v1/subcontractors/:id                      # Update subcontractor
POST   /api/v1/subcontractors/:id/deactivate           # Deactivate subcontractor
GET    /api/v1/subcontractors/:id/compliance           # Get compliance status
POST   /api/v1/subcontractors/:id/performance/evaluate # Evaluate performance
GET    /api/v1/subcontractors/:id/performance          # Get performance summary
POST   /api/v1/jobs/:jobId/subcontractors              # Assign subcontractor to job
GET    /api/v1/jobs/:jobId/subcontractors              # List job's subcontractors
```

**Dashboard Routes**:

- `/subcontractors` - List view with compliance/performance filters
- `/subcontractors/[id]` - Detail view with compliance card, performance card, and assigned jobs

**Configuration**:

```env
INTERNAL_API_KEY="your-internal-api-key-here"      # Protect internal endpoints
JOBNIMBUS_BASE_URL="https://api.jobnimbus.com"     # JobNimbus API base
JOBNIMBUS_API_KEY="your-jobnimbus-api-key"         # JobNimbus API authentication
```

See **[Subcontractor Management System](docs/06-subcontractor-system.md)** for detailed documentation.

## 🚨 Safety & Incident Reporting

Phase 2 Sprint 2 introduced a comprehensive safety management system with incident tracking, OSHA compliance reporting, and integration with risk assessment and subcontractor performance.

**Features**:

- ✅ Incident reporting (injury, property damage, near miss, violations, crew issues)
- ✅ Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Status tracking (OPEN, UNDER_REVIEW, CLOSED)
- ✅ Safety checklists (toolbox talks, PPE, ladder, fall protection, heat, electrical)
- ✅ OSHA 300/300A summary reports
- ✅ JobNimbus integration (notes/tasks for MEDIUM+ incidents)
- ✅ Risk Dashboard integration (SAFETY_INCIDENT reason)
- ✅ Subcontractor performance impact (-10 points per incident)
- ✅ Location tracking with GPS coordinates
- ✅ Photo attachments for incidents

**API Endpoints**:

```
POST   /api/v1/safety/incidents                        # Create incident
GET    /api/v1/safety/incidents                        # List with filters
GET    /api/v1/safety/incidents/:id                    # Get single incident
PATCH  /api/v1/safety/incidents/:id/status             # Update status
GET    /api/v1/safety/incidents-summary                # Get summary statistics
GET    /api/v1/safety/osha-summary                     # OSHA annual summary
POST   /api/v1/safety/checklists                       # Create checklist
GET    /api/v1/safety/checklists                       # List checklists
```

**Dashboard Routes** (To Be Implemented):

- `/safety` - Overview with summary cards and incident table
- `/safety/incidents/[id]` - Incident detail with photos, status, job/subcontractor links

**Configuration**:

```env
JOBNIMBUS_BASE_URL="https://api.jobnimbus.com"     # JobNimbus API base
JOBNIMBUS_API_KEY="your-jobnimbus-api-key"         # JobNimbus API authentication
```

See **[Safety & Incident Reporting System](docs/07-safety-system.md)** for detailed documentation.

## 🛡️ Warranty System

Phase 2 Sprint 3 introduced a comprehensive warranty management system with automated expiry tracking, customer service requests, and claim management.

**Features**:

- ✅ Warranty activation upon job completion with configurable terms (default 10 years)
- ✅ Automated expiry monitoring with daily scheduled jobs
- ✅ Customer portal warranty display and service request form
- ✅ Internal claim management with status workflow
- ✅ Priority levels (LOW, MEDIUM, HIGH) for claim triage
- ✅ JobNimbus integration for activations, claims, and expiry warnings
- ✅ Summary dashboard with active, expiring, and expired warranty counts

**Warranty Status**: PENDING_ACTIVATION | ACTIVE | EXPIRED | CANCELLED

**Claim Status**: OPEN | IN_REVIEW | APPROVED | REJECTED | RESOLVED

**API Endpoints**:

```
POST   /api/v1/warranty/jobs/:jobId/activate          # Activate warranty
GET    /api/v1/warranty/jobs/:jobId                   # Get warranty for job
GET    /api/v1/warranty                               # List warranties (with filters)
GET    /api/v1/warranty/summary                       # Get summary statistics
POST   /api/v1/warranty/claims                        # Create internal claim
GET    /api/v1/warranty/claims                        # List claims (with filters)
GET    /api/v1/warranty/claims/:id                    # Get single claim
PATCH  /api/v1/warranty/claims/:id/status             # Update claim status
POST   /api/v1/portal/jobs/:jobId/warranty-claims     # Submit claim from portal
```

**Dashboard Routes**:

- `/warranty` - Overview with summary cards, warranties table, and recent claims

**Customer Portal**:

- Job detail page → Documents tab displays warranty information with status badge
- Service request form allows customers to submit warranty claims directly
- Warranty document download if available

**Scheduled Jobs**:

- Daily at 3 AM: Processes expiring warranties (default 30 days threshold)
- Creates JobNimbus notes and tasks for expiry warnings

**Configuration**:

```env
WARRANTY_DEFAULT_TERM_MONTHS=120          # Default warranty duration (10 years)
WARRANTY_EXPIRY_NOTICE_DAYS=30            # Days before expiry to send notifications
```

See **[Warranty System](docs/08-warranty-system.md)** for detailed documentation.

## 📦 Materials & Scheduling

Phase 2 Sprint 4 introduced predictive scheduling capabilities with material ETA tracking and risk-based scheduling analysis.

**Features**:

- ✅ Material order tracking with ETA computation (ON_TRACK, AT_RISK, LATE)
- ✅ Scheduling risk analysis combining material delays, job risk, and subcontractor performance
- ✅ Real-time dashboard showing delivery delays and scheduling conflicts
- ✅ Automated risk level computation (LOW, MEDIUM, HIGH) for all active jobs
- ✅ Summary statistics for material orders and scheduling risks

**API Endpoints**:

```
POST   /api/v1/material-orders/jobs/:jobId             # Create material order
PATCH  /api/v1/material-orders/:id                     # Update material order
GET    /api/v1/material-orders                         # List orders (with filters)
GET    /api/v1/material-orders/jobs/:jobId             # Get orders for job
GET    /api/v1/material-orders/summary                 # Get material summary
GET    /api/v1/scheduling/overview                     # Get scheduling risks for all jobs
GET    /api/v1/scheduling/jobs/:jobId                  # Get scheduling risk for job
```

**Dashboard Routes**:

- `/materials` - Materials overview with order status, ETA tracking, and supplier filters
- `/schedule` - Scheduling overview with risk analysis and multi-factor alerts

**Material Order Status**: PENDING | ORDERED | SHIPPED | DELIVERED | DELAYED | CANCELLED

**ETA Status Logic**:
- ON_TRACK: Order delivered OR delivery >3 days away
- AT_RISK: Delivery within 3 days OR no delivery date set
- LATE: Expected delivery passed and not delivered

**Scheduling Risk Factors**:
1. Material delivery delays (etaStatus LATE → HIGH risk, AT_RISK → MEDIUM risk)
2. Job risk levels from Risk Dashboard (HIGH → HIGH risk, MEDIUM → MEDIUM risk)
3. Subcontractor performance (RED → HIGH risk, YELLOW → MEDIUM risk)

**Configuration**:

```env
ETA_AT_RISK_THRESHOLD_DAYS=3               # Days threshold for at-risk status
```

See **[Material & Scheduling System](docs/09-material-scheduling-system.md)** for detailed documentation.

## 🤖 AI Operations Assistant

Phase 2 Sprint 5 introduced an AI-powered operations assistant that generates job summaries, actionable recommendations, and customer-facing message drafts using deterministic rule-based logic.

**Features**:

- ✅ Comprehensive job summaries aggregating data from QC, Risk, Safety, Materials, and Warranty
- ✅ Prioritized recommendations (QC, RISK, SAFETY, MATERIALS, SCHEDULING, WARRANTY, GENERAL)
- ✅ Customer message generator with tone control (FRIENDLY/FORMAL) and message types
- ✅ Job lookup dashboard with collapsible sections and recommendations table
- ✅ Designed for future LLM integration (OpenAI, Anthropic, local models)
- ✅ 22 comprehensive test cases covering all scenarios

**API Endpoints**:

```
GET   /api/v1/ai-ops/jobs/:jobId/summary            # Get AI-generated job summary
GET   /api/v1/ai-ops/jobs/:jobId/recommendations    # Get actionable recommendations
GET   /api/v1/ai-ops/jobs/:jobId/insights           # Get summary + recommendations
POST  /api/v1/ai-ops/jobs/:jobId/customer-message   # Generate customer message
```

**Dashboard Routes**:

- `/ai-ops` - AI Assistant with job lookup, summary display, recommendations table, and message generator

**Message Types**: STATUS_UPDATE | ETA_UPDATE | GENERIC

**Recommendation Categories**: QC | RISK | SAFETY | MATERIALS | SCHEDULING | WARRANTY | CUSTOMER | GENERAL

**Priority Levels**: HIGH | MEDIUM | LOW

**AI Logic v1 (Rules-Based)**:
- QC FAIL → HIGH priority QC recommendation
- Risk HIGH → HIGH priority RISK recommendation
- Safety incidents (CRITICAL/HIGH) → HIGH priority SAFETY recommendation
- Material ETA LATE → HIGH priority MATERIALS recommendation
- Subcontractor RED performance → HIGH priority SCHEDULING recommendation
- Open warranty claims → MEDIUM priority WARRANTY recommendation
- Always includes GENERAL recommendation with next best action

**Customer Message Generation**:
- STATUS_UPDATE: Current status + next step based on job phase
- ETA_UPDATE: Material delivery status + installation timeline
- GENERIC: Custom question response with job context
- Tone control for friendly or formal language

**Future Enhancements (v2)**:
- Real LLM integration (OpenAI, Anthropic, local models)
- Multi-job portfolio insights
- Predictive recommendations
- Proactive alerts for HIGH priority items

See **[AI Operations Assistant](docs/10-ai-operations-assistant.md)** for detailed documentation.

## 💰 Profit & Executive Dashboard

Phase 2 Sprint 6 introduced a profit and executive dashboard for job-level profitability tracking and portfolio performance analysis without external accounting integration.

**Features**:

- ✅ Job financial snapshots with contract amount, costs, and margin calculations
- ✅ Profitability levels (LOW < 10%, MEDIUM 10-25%, HIGH ≥ 25%)
- ✅ Executive summary metrics (total contract amount, total margin, average margin %)
- ✅ High-risk low-margin job identification
- ✅ Client-side filtering by profitability level and risk level
- ✅ Integration with existing Risk Dashboard data

**API Endpoints**:

```
GET   /api/v1/profit/dashboard/summary            # Get aggregated summary metrics
GET   /api/v1/profit/dashboard/jobs               # List jobs with filters (profitabilityLevel, riskLevel)
GET   /api/v1/profit/jobs/:jobId                  # Get financial snapshot for job
POST  /api/v1/profit/jobs/:jobId/recalculate      # Trigger snapshot recalculation
POST  /api/v1/profit/recalculate-all              # Recalculate all job snapshots
```

**Dashboard Routes**:

- `/profit` - Executive dashboard with summary cards, profitability/risk filters, and jobs table

**Financial Calculations**:
- `marginAmount = contractAmount - actualCost` (or estimatedCost if actualCost unavailable)
- `marginPercent = (marginAmount / contractAmount) * 100`
- v1 uses systemSize-based placeholder for contract amount ($3.50/W)

**Profitability Thresholds**:
- **LOW**: marginPercent < 10%
- **MEDIUM**: 10% ≤ marginPercent < 25%
- **HIGH**: marginPercent ≥ 25%

**Future Enhancements**:
- Per-cost-category breakdown (labor, materials, permits)
- Time-series margin tracking
- Actual cost tracking from invoices and expenses

## 💼 Accounting & QuickBooks Integration

Phase 3 Sprint 1 & 2 delivered QuickBooks Online integration with OAuth2 automatic token refresh and scheduled sync capabilities.

**Features**:

- ✅ QuickBooks Online API integration (read-only)
- ✅ OAuth2 automatic token refresh (Sprint 2)
- ✅ Contract amount sync from QB invoices
- ✅ Scheduled daily sync at 2 AM (Sprint 2)
- ✅ Accounting source tracking (PLACEHOLDER, QUICKBOOKS, MANUAL)
- ✅ Sync timestamp tracking
- ✅ Error-resilient batch sync
- ✅ UI sync controls: "Sync All" and per-job buttons (Sprint 2)

**API Endpoints**:

```
POST  /api/v1/accounting/jobs/:jobId/sync    # Sync single job from QuickBooks
POST  /api/v1/accounting/sync-all            # Sync all active jobs from QuickBooks
```

**Configuration** (Environment Variables):

```bash
QB_ENABLED=true                                # Enable/disable QuickBooks sync
QB_BASE_URL=https://quickbooks.api.intuit.com  # QuickBooks API base URL
QB_COMPANY_ID=your_company_id                  # QuickBooks Company ID (Realm ID)

# OAuth2 (Sprint 2)
QB_CLIENT_ID=your_client_id                    # OAuth2 Client ID
QB_CLIENT_SECRET=your_client_secret            # OAuth2 Client Secret
QB_REFRESH_TOKEN=your_refresh_token            # Refresh token (from initial OAuth)
QB_ACCESS_TOKEN=your_access_token              # Fallback token (optional)

# Scheduled Sync (Sprint 2)
QB_SYNC_ENABLED=true                           # Enable automatic daily sync at 2 AM
```

**QuickBooks Mapping**:
- `Job.jobNimbusId` ↔ `QuickBooks Invoice.DocNumber`
- `Invoice.TotalAmt` → `JobFinancialSnapshot.contractAmount`
- Multiple invoices: Uses latest by TxnDate

**OAuth2 Token Management** (Sprint 2):
- Automatic token refresh using refresh token
- Token caching with 5-minute safety margin
- Fallback to QB_ACCESS_TOKEN if OAuth2 not configured
- No manual token management after initial setup

**Scheduled Sync** (Sprint 2):
- Built-in daily sync at 2 AM via `@Cron` scheduler
- Enabled with `QB_SYNC_ENABLED=true`
- Processes all active jobs automatically
- Error-resilient batch processing

**Service Behavior**:
- ProfitabilityService respects QuickBooks data
- If `accountingSource = 'QUICKBOOKS'`, `contractAmount` is NOT overwritten
- Placeholder calculation only used when no QB data exists

**Dashboard Enhancements** (Sprint 1 & 2):
- Accounting Source column with color-coded badges (Blue=QuickBooks, Gray=Placeholder, Purple=Manual)
- Sync timestamp display
- **"Sync All from QuickBooks" button** for batch sync (Sprint 2)
- Per-job "Sync QB" button for manual sync
- Loading states and success/error feedback

**Future Enhancements**:
- Cost breakdown sync (labor, materials, permits)
- Multi-invoice support
- Webhook integration for real-time updates
- Change order tracking

See **[Accounting Integration](docs/12-accounting-integration.md)** for detailed documentation.

## 🚀 Deployment & Environments

**Phase 3 Sprint 3**: Production-ready deployment strategy for Vercel (frontends) and Railway (backend + database).

**Architecture**:
- **Frontends**: `customer-portal` and `internal-dashboard` deployed to Vercel
- **Backend**: `core-api` (NestJS + Dockerfile) deployed to Railway
- **Database**: PostgreSQL 15 on Railway
- **External Integrations**: JobNimbus API, QuickBooks OAuth2

**Deployment Guides**:
- **Vercel**: Step-by-step setup for both Next.js apps with environment variables
- **Railway**: Docker-based deployment with PostgreSQL provisioning
- **Environment Variables**: Comprehensive `.env.example` files for all services
- **Rollout Strategy**: Pre-deployment checklist, testing, and rollback procedures

**Cost Estimates**:
- Vercel Hobby: $0/month (2 projects, 100GB bandwidth)
- Railway Starter: ~$5/month (API + PostgreSQL)
- **Total Infrastructure**: ~$5-10/month

**Files**:
- `apps/core-api/Dockerfile` - Production-ready multi-stage Docker build
- `apps/core-api/.dockerignore` - Optimized Docker context
- `.env.example` - Consolidated environment variables for all services
- `apps/internal-dashboard/.env.example` - Dashboard-specific env vars

**Documentation**:
See **[Deployment & Environments Guide](docs/11-deployment-and-environments.md)** for complete deployment instructions, troubleshooting, and best practices.

## 🔗 Embedded Panels for JobNimbus

Phase 1 Sprint 6 introduced embedded panels that display internal data within JobNimbus iframes using secure signed tokens.

**Features**:

- ✅ Three panel types: QC Panel, Risk View, Customer Portal Preview
- ✅ JWT-based token authentication (HS256, configurable TTL)
- ✅ Time-limited sessions (default 30 minutes)
- ✅ Minimal iframe-friendly layouts
- ✅ No separate login required
- ✅ Internal API key protection

**Panel Routes**:

- `/embed/qc?token=...` - QC summary with photo counts and missing requirements
- `/embed/risk?token=...` - Risk level with reasons and severity badges
- `/embed/portal?token=...` - Customer portal preview with status timeline

**API Endpoints**:

- `POST /api/v1/embed/links` - Generate embed link (requires internal API key)
- `GET /api/v1/embed/session/resolve` - Validate and resolve token
- `GET /api/v1/portal/internal/jobs/:jobId` - Internal portal preview (requires API key)

**Configuration**:

```env
EMBED_SIGNING_SECRET="your-secret-key-for-signing-jwt-tokens"  # Required for production
EMBED_TOKEN_TTL_MINUTES="30"                                    # Token expiration (default: 30)
INTERNAL_DASHBOARD_BASE_URL="http://localhost:3002"            # Embed URL base
INTERNAL_API_KEY="your-internal-api-key-here"                  # Protect internal endpoints
```

**Example Usage**:

```bash
# Generate an embed link
curl -X POST http://localhost:3000/api/v1/embed/links \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-internal-api-key-here" \
  -d '{"jobId": "abc123", "panelType": "QC_PANEL"}'

# Response:
{
  "url": "http://localhost:3002/embed/qc?token=eyJhbGc...",
  "panelType": "QC_PANEL",
  "jobId": "abc123",
  "expiresAt": "2024-01-01T12:30:00Z"
}

# Display in iframe:
<iframe src="http://localhost:3002/embed/qc?token=eyJhbGc..." width="100%" height="600" />
```

See **[JobNimbus Integration Guide](docs/05-jobnimbus-integration.md)** for detailed embed panel documentation.

## 🏥 Health & Monitoring

**Health Check Endpoints**:

- `GET /health` - Basic service health check
- `GET /health/phase-1` - Phase 1 summary with jobs, QC checks, risk snapshots, and portal sessions

**Phase 1 Health Summary** (example response):

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "phase": "Phase 1",
  "version": "1.0.0",
  "summary": {
    "jobs": { "total": 150, "last24h": 5 },
    "qc": { "totalChecks": 120, "checksLast24h": 8, "failedChecks": 12 },
    "risk": { "totalSnapshots": 100, "snapshotsLast24h": 10, "highRiskJobs": 15 },
    "portal": { "totalSessions": 80, "sessionsLast24h": 6 }
  }
}
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture](docs/01-architecture.md)** - System architecture and design
- **[Phase 1 Roadmap](docs/02-phase-1-roadmap.md)** - Foundation & JobNimbus integration
- **[Phase 2 Roadmap](docs/03-phase-2-roadmap.md)** - Operational excellence
- **[Phase 3 Roadmap](docs/04-phase-3-roadmap.md)** - Automation & intelligence
- **[JobNimbus Integration](docs/05-jobnimbus-integration.md)** - Integration guide
- **[Subcontractor Management](docs/06-subcontractor-system.md)** - Compliance & performance tracking
- **[Safety & Incident Reporting](docs/07-safety-system.md)** - Safety management & OSHA compliance
- **[Warranty System](docs/08-warranty-system.md)** - Warranty management & claim tracking
- **[Material & Scheduling System](docs/09-material-scheduling-system.md)** - Material ETA tracking & predictive scheduling

## 🎯 Development Roadmap

### Phase 1: Foundation (Weeks 1-14) ✅ COMPLETED

- ✅ Monorepo setup with pnpm + Turborepo
- ✅ Database schema and Prisma ORM
- ✅ Shared packages (types, UI, config)
- ✅ JobNimbus sync engine
- ✅ Customer portal with magic link auth
- ✅ QC & Photo Module v1 (photo ingestion, classification, 5/5/5 rules, JobNimbus write-back)
- ✅ Risk Dashboard v1 (rule-based evaluation, JobNimbus deep links, operational visibility)
- ✅ Embedded Panels v1 (QC Panel, Risk View, Customer Portal Preview with JWT tokens)
- ✅ Health monitoring endpoints with Phase 1 summary statistics

### Phase 2: Operational Excellence (Weeks 11-20)

- ✅ Subcontractor Management v1 (Sprint 1: directory, compliance tracking, performance scoring, job assignment guards, JobNimbus integration)
- ✅ Safety & Incident Reporting v1 (Sprint 2: incident tracking, safety checklists, OSHA summaries, risk/subcontractor integration, JobNimbus notifications)
- ✅ Warranty Management v1 (Sprint 3: activation, expiry tracking, claim management, customer portal integration, internal dashboard)
- ✅ Material & Scheduling v1 (Sprint 4: material ETA tracking, predictive scheduling, risk computation, internal dashboard)
- AI-powered photo QC (Sprint 5)

### Phase 3: Automation & Intelligence (Weeks 21-30)

- Workflow automation engine
- Intelligent dispatching
- Finance integrations
- Forecasting and analytics
- Command center v2

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @greenenergy/core-api test

# Run tests in watch mode
pnpm --filter @greenenergy/core-api test:watch

# Generate coverage
pnpm --filter @greenenergy/core-api test:cov
```

## 🔨 Tech Stack

- **Language**: TypeScript (strict mode)
- **Backend**: NestJS
- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **UI**: React + Tailwind CSS + shadcn/ui
- **Monorepo**: pnpm + Turborepo
- **CI/CD**: GitHub Actions
- **Infrastructure**: Docker + (TBD: AWS/GCP/Azure/Vercel)

## 🏗️ Infrastructure

### Local Development

- PostgreSQL via Docker Compose
- All apps run on localhost with different ports

### Production (Planned)

- Infrastructure-as-Code with Terraform
- CI/CD via GitHub Actions
- Hosting TBD (Vercel, AWS, GCP, or Azure)

See `infra/` directory for Docker Compose and Terraform configurations.

## 🤝 Contributing

This is a professional internal project. Follow these guidelines:

1. **Branching**: Create feature branches from `main`
2. **Commits**: Use conventional commits (feat, fix, docs, etc.)
3. **Testing**: Write tests for new features
4. **Linting**: Code must pass `pnpm lint` before PR
5. **Type Safety**: All TypeScript must be strictly typed

## 📄 License

UNLICENSED - Internal use only

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Frontend powered by [Next.js](https://nextjs.org/)
- UI components from [Tailwind CSS](https://tailwindcss.com/)
- Monorepo managed by [Turborepo](https://turbo.build/)
