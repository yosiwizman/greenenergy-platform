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
pnpm smoke:staging # Run staging smoke tests (requires env vars)
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

## 💬 Customer Experience Engine v1

Phase 4 Sprint 1 introduced a structured customer messaging timeline system that lays the foundation for future email/SMS notifications.

**Features**:

- ✅ Message timeline stored per job (status updates, ETA messages, generic messages)
- ✅ AI-assisted message generation using existing AI Ops Assistant
- ✅ Customer portal integration with Messages tab
- ✅ Internal APIs for operations staff to create and view messages
- ✅ Read/unread tracking for customer engagement analytics
- ✅ Message type classification (STATUS_UPDATE, ETA_UPDATE, GENERIC)
- ✅ Channel preparation (PORTAL, EMAIL, SMS for future integration)
- ✅ Source tracking (SYSTEM, HUMAN, AI_SUGGESTED)

**API Endpoints**:

```
GET   /api/v1/cx/jobs/:jobId/messages              # List messages for job (internal)
POST  /api/v1/cx/jobs/:jobId/messages              # Create manual message (internal)
POST  /api/v1/cx/jobs/:jobId/messages/ai           # Generate AI message (internal)
POST  /api/v1/cx/jobs/:jobId/read                  # Mark messages read (internal)
GET   /api/v1/portal/jobs/:jobId/messages          # Fetch messages (customer portal)
POST  /api/v1/portal/jobs/:jobId/messages/read     # Mark messages read (customer portal)
```

**Customer Portal**:

- Job detail page → Messages tab displays chronological timeline
- Type badges (STATUS_UPDATE, ETA_UPDATE, GENERIC)
- AI-assisted indicator for AI-generated messages
- Message count badge on tab button
- Auto-marks messages as read when viewed

**Message Types**:
- **STATUS_UPDATE**: Project status changes and milestone completions
- **ETA_UPDATE**: Installation timeline and material delivery updates
- **GENERIC**: General announcements, holiday greetings, maintenance reminders

**AI Integration**:
- Reuses existing `AiOperationsService.generateCustomerMessage()` method
- Supports tone control (FRIENDLY/FORMAL)
- Custom prompts for specialized messages
- Messages saved with `AI_SUGGESTED` source for review workflow

**Future Enhancements (Phase 4 Sprint 2+)**:
- Email/SMS delivery integration
- Message templates library
- Bulk messaging capabilities
- Message approval workflow for AI-suggested drafts
- Webhooks for automated message triggers
- Customer engagement analytics (read rates, response times)

See **[Customer Experience Engine](docs/15-customer-experience-engine.md)** for detailed documentation.

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

## 📊 Finance & AR Dashboard

Phase 5 Sprint 1 extends the QuickBooks integration to sync payment data and provide real-time visibility into Accounts Receivable (AR) status.

**Features**:

- ✅ Payment sync from QuickBooks linked to invoices
- ✅ AR status computation (PAID, PARTIALLY_PAID, UNPAID, OVERDUE)
- ✅ Amount paid and outstanding tracking per job
- ✅ Invoice due date tracking
- ✅ Finance API endpoints for AR visibility
- ✅ Finance dashboard with AR summary and job-level details
- ✅ Integration with daily QuickBooks sync

**AR Status Logic**:

| Status | Condition |
|--------|----------|
| PAID | Outstanding ≤ 0 (fully paid) |
| PARTIALLY_PAID | Some payment made, outstanding > 0 |
| UNPAID | No payments, outstanding > 0 |
| OVERDUE | Due date passed, outstanding > 0 (takes precedence) |

**API Endpoints**:

```
GET   /api/v1/finance/ar/summary           # Aggregated AR metrics
GET   /api/v1/finance/ar/jobs              # List jobs with AR details (optional ?status filter)
GET   /api/v1/finance/ar/jobs/:jobId       # AR details for specific job
```

**Dashboard Routes**:

- `/finance` - AR dashboard with summary cards (outstanding, paid, overdue) and filterable jobs table

**Summary Cards**:
- Total Outstanding (red)
- Total Paid (green)
- Total Contract Value (blue)
- Partially Paid count (amber)

**Jobs Table**:
- Job number, customer name, status
- Contract amount, amount paid, outstanding
- AR status badge (color-coded: GREEN=Paid, BLUE=Partially Paid, YELLOW=Unpaid, RED=Overdue)
- Invoice due date, last payment date
- Payment history with details (amount, method, reference)

**Data Model**:

New `Payment` model tracks individual payments:
- Linked to Job and QuickBooks invoice
- Amount, received date, payment method
- Reference numbers (check #, transaction ID, etc.)

Extended `JobFinancialSnapshot` with AR fields:
- `amountPaid`, `amountOutstanding`, `arStatus`
- `lastPaymentAt`, `invoiceDueDate`

**Integration**:
- Daily QuickBooks sync automatically updates AR data
- Payment records upserted from QB (keyed by external ID)
- AR status computed based on payment data and due dates
- No additional configuration required beyond existing QB setup

**Phase 5 Sprint 2 Extensions**:

- ✅ **AR Aging Buckets**: 5 categories (CURRENT, 1-30, 31-60, 61-90, 91+ days overdue)
- ✅ **Automated Payment Reminders**: Email reminders for invoices 7+ days overdue
- ✅ **Aging Dashboard**: Visual display of outstanding amounts by aging bucket
- ✅ **Workflow Integration**: Payment reminders triggered via workflow engine with 7-day cooldown
- ✅ `GET /api/v1/finance/ar/aging` - Aging summary endpoint

**Phase 5 Sprint 3 Extensions**:

- ✅ **Invoice Creation**: Generate invoices in QuickBooks from the platform
- ✅ **Invoice Data Model**: Full invoice storage and retrieval with QB sync
- ✅ **Invoice API Endpoints**:
  - `POST /api/v1/finance/ar/jobs/:jobId/invoices` - Create invoice in QuickBooks
  - `GET /api/v1/finance/ar/jobs/:jobId/invoices` - List invoices for job
  - `GET /api/v1/finance/ar/jobs/:jobId/invoices/:invoiceId` - Get specific invoice
- ✅ **INVOICE_ISSUED Email Notifications**: Automated customer emails with invoice details
- ✅ **Primary Invoice Tracking**: Link invoices to financial snapshots
- ✅ **Test Coverage**: Comprehensive tests for invoice creation and retrieval

**Future Enhancements** (Phase 5 Sprint 4+):
- Multi-line item invoices with custom descriptions
- Custom invoice templates and branding
- Escalation reminders (multiple stages)
- SMS reminders
- Payment links in emails (Stripe, Square integration)
- AI-powered payment forecasting
- Invoice PDF generation and delivery
- Bulk invoice creation

See **[Accounting Integration](docs/12-accounting-integration.md)** for detailed documentation (includes AR & aging sections).

## 📈 Forecasting Dashboard

**Phase 6 Sprint 1**: Executive-level forecasting dashboard providing deterministic cashflow and weighted pipeline projections.

**Features**:

- ✅ **12-Week Cashflow Forecast**: Expected cash inflows based on open invoice due dates
- ✅ **Weighted Pipeline**: Pipeline value by job status with deterministic win probabilities
- ✅ **Executive Dashboard**: `/forecast` page with summary cards and visualizations
- ✅ **Forecast API Endpoints**:
  - `GET /api/v1/forecast/cashflow?weeks=12` - Cashflow forecast (configurable 1-52 weeks)
  - `GET /api/v1/forecast/pipeline` - Pipeline forecast with weighted values
  - `GET /api/v1/forecast/overview?weeks=12` - Combined forecast overview
- ✅ **Deterministic Calculations**: No AI/ML dependencies (status-based probabilities)
- ✅ **Comprehensive Tests**: 9 tests covering cashflow and pipeline logic

**Cashflow Forecasting**:

- Weekly buckets (Monday start)
- Open invoices with `balance > 0`
- Assigns invoices to weeks based on `dueDate`
- Overdue invoices contribute to first week with `overduePortion` flag
- Configurable horizon (1-52 weeks, default 12)

**Pipeline Forecasting**:

- Status-based win probabilities (LEAD: 20%, QUALIFIED: 30%, SCHEDULED: 85%, IN_PROGRESS: 95%, etc.)
- Filters pipeline jobs (excludes COMPLETE, CANCELLED, LOST, and PAID)
- Calculates `weightedAmount = totalAmount × winProbability`
- Sorted by weighted amount descending

**Win Probability Mapping**:

| Status | Win Probability |
|--------|-----------------|
| LEAD | 20% |
| QUALIFIED | 30% |
| SITE_SURVEY | 40% |
| DESIGN | 50% |
| PERMITTING | 60% |
| APPROVED | 70% |
| SCHEDULED | 85% |
| IN_PROGRESS | 95% |
| *Unknown* | 15% (default) |

**Dashboard Metrics** (`/forecast`):

- Total Pipeline (Gross)
- Weighted Pipeline
- Expected Inflow (Next 30 Days)
- Expected Inflow (Next 90 Days)
- Weekly cashflow chart with overdue indicators
- Pipeline breakdown table by status

**Future Enhancements** (Phase 6 Sprint 2+):

- AI-powered payment velocity modeling
- Confidence intervals and scenario analysis
- Seasonality adjustment using time-series analysis
- Win probability ML model trained on historical data
- Customer payment scoring
- Integration with financial planning tools

See **[Forecasting & Analytics](docs/17-forecasting-and-analytics.md)** for detailed documentation.

## 📧 Executive Weekly Digest

**Phase 6 Sprint 2**: Automated weekly email digest summarizing AR, forecast, risk, and operational metrics for business owners.

**Features**:

- ✅ **Automated Weekly Email**: Sent every Monday at 7:00 AM to configured recipients
- ✅ **Comprehensive Metrics**: Finance/AR summary, aging buckets, cashflow forecast, pipeline, risk indicators
- ✅ **Internal Dashboard Preview**: `/exec-report` page for real-time digest preview
- ✅ **Manual Trigger**: Send digest on-demand via dashboard or API
- ✅ **Data Composition**: Reuses Finance, Forecast, Command Center, and Workflow services
- ✅ **Scheduled Cron Job**: Automatic delivery every Monday (configurable)

**Digest Contents**:

- **Key Metrics**:
  - High-risk jobs count
  - Open safety incidents
  - Overdue AR jobs
  - Workflows triggered (during period)
- **Finance & AR Summary**:
  - Total outstanding, paid, contract value
  - Job payment status breakdown (Paid, Partially Paid, Unpaid, Overdue)
- **AR Aging Analysis**:
  - 5 aging buckets (Current, 1-30, 31-60, 61-90, 91+ days)
- **Cashflow & Pipeline Forecast**:
  - 12-week cashflow outlook
  - Weighted pipeline by stage
  - Top pipeline stages by value

**API Endpoints**:

```bash
GET  /api/v1/exec-report/weekly      # Preview digest
POST /api/v1/exec-report/weekly/send # Send digest email
```

**Configuration**:

```env
EXEC_DIGEST_RECIPIENTS="owner@yourdomain.com,partner@yourdomain.com"
```

**Dashboard**:

- `/exec-report` - Visual digest dashboard with "Refresh" and "Send Email Now" buttons
- Two-column layout: Finance/AR (left), Forecast (right)
- Color-coded metric cards (red for risk, green for positive, blue for pipeline)

**Period Calculation**: Digest covers the previous week (Monday–Sunday). Workflow counts are for that specific period; all other metrics are current snapshots.

See **[Executive Digest & Reporting](docs/18-executive-digest-and-reporting.md)** for detailed documentation.

## 🚀 Deployment & Environments

**Phase 3 Sprint 3 & 8**: Production-ready deployment strategy with automated smoke tests for operational readiness.

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

**Staging Smoke Tests** (Sprint 8):

After deploying to staging/production, run automated health checks:

```bash
# 1. Set environment variables in .env or shell:
STAGING_API_BASE_URL=https://your-api.railway.app
STAGING_INTERNAL_DASHBOARD_URL=https://your-dashboard.vercel.app
STAGING_CUSTOMER_PORTAL_URL=https://your-portal.vercel.app
STAGING_INTERNAL_API_KEY=your-internal-api-key

# 2. Run smoke tests:
pnpm smoke:staging
```

The smoke test script validates:
- ✅ API health endpoint
- ✅ Command Center Overview API (with internal auth)
- ✅ Workflow Rules API
- ✅ Internal Dashboard pages (command-center, workflows)
- ✅ Customer Portal root page

All checks must pass before proceeding with manual verification.

**Cost Estimates**:
- Vercel Hobby: $0/month (2 projects, 100GB bandwidth)
- Railway Starter: ~$5/month (API + PostgreSQL)
- **Total Infrastructure**: ~$5-10/month

**Files**:
- `apps/core-api/Dockerfile` - Production-ready multi-stage Docker build
- `apps/core-api/.dockerignore` - Optimized Docker context
- `.env.example` - Consolidated environment variables for all services
- `apps/internal-dashboard/.env.example` - Dashboard-specific env vars
- `tools/smoke-tests/` - Staging smoke test harness

**Documentation**:
- **[Deployment & Environments Guide](docs/11-deployment-and-environments.md)** - Complete deployment instructions, troubleshooting, and best practices
- **[Staging Smoke Tests & Go-Live Checklist](docs/16-staging-smoke-tests-and-go-live-checklist.md)** - Operational readiness playbook with smoke tests and troubleshooting

## 🤖 Workflow Automation Engine

**Phase 3 Sprint 4 & 5**: Rules-based workflow automation engine that continuously monitors jobs and automatically creates JobNimbus tasks/notes when conditions are met.

**Features**:

- ✅ 8 workflow rules across 6 departments (SALES, PRODUCTION, ADMIN, SAFETY, WARRANTY, FINANCE)
- ✅ Automatic task/note creation in JobNimbus
- ✅ Deduplication logic with configurable cooldown periods
- ✅ Daily automated execution at 4 AM (via cron)
- ✅ Manual trigger controls (single job or all jobs)
- ✅ Internal dashboard at `/workflows` with filtering and execution controls
- ✅ Action log tracking for audit trail and analytics

**Workflow Rules**:

1. **SALES_ESTIMATE_FOLLOWUP_72H** - Follow up on estimates with no update for ≥72 hours (7-day cooldown)
2. **PRODUCTION_QC_FAIL_NEEDS_PHOTOS** - QC failures with missing photo categories (3-day cooldown)
3. **PRODUCTION_MATERIAL_DELAY** - Material orders past expected delivery date (2-day cooldown)
4. **ADMIN_SUB_NONCOMPLIANT_ASSIGNED** - Non-compliant subcontractors assigned to jobs (1-day cooldown)
5. **SAFETY_OPEN_HIGH_SEVERITY_INCIDENT** - Open HIGH/CRITICAL safety incidents (1-day cooldown)
6. **WARRANTY_EXPIRING_SOON** - Warranties expiring within 30 days (14-day cooldown)
7. **FINANCE_LOW_MARGIN_HIGH_RISK_JOB** - Jobs with <10% margin AND HIGH risk (7-day cooldown)
8. **FINANCE_MISSING_CONTRACT_AMOUNT** - Active jobs missing contract amounts (5-day cooldown)
9. **FINANCE_AR_OVERDUE_PAYMENT_REMINDER** - Automated payment reminders for invoices 7+ days overdue (7-day cooldown) *Phase 5 Sprint 2*

**API Endpoints**:

```
GET   /api/v1/workflows/rules                   # List all workflow rules
GET   /api/v1/workflows/logs                    # Get recent action logs (with filters)
POST  /api/v1/workflows/jobs/:jobId/run         # Run workflows for single job
POST  /api/v1/workflows/run-all                 # Run workflows for all active jobs
```

**Configuration** (Environment Variables):

```bash
WORKFLOW_AUTOMATION_ENABLED=false        # Enable/disable automatic daily execution
WORKFLOW_AUTOMATION_DAILY_LIMIT=500     # Max jobs to process per daily run
```

**Dashboard** (`/workflows`):

- **Rules Summary Table**: View all 8 rules with department badges, descriptions, and status
- **Recent Actions Table**: View workflow actions with filtering by Job ID, Rule, and Limit
- **Manual Execution Controls**:
  - "Run All Workflows" button (top-right header)
  - "Run for Single Job" panel with Job ID input
  - Real-time success/error feedback with action counts
- **Empty State**: Helpful message when no actions have been recorded yet

**Deduplication**:

Each rule has a cooldown period (1-14 days). Before firing, the engine checks `WorkflowActionLog` for recent actions on the same job + rule combination. If found within the cooldown window, the rule is skipped to prevent duplicate tasks.

**Performance**:

- Processes 500 jobs in <30 seconds
- Error isolation (one rule failure doesn't affect others)
- Sequential execution to avoid JobNimbus API rate limits

**Business Impact**:

- Reduced manual follow-up work
- Proactive alerts for compliance and safety issues
- Financial oversight for risky jobs
- Customer retention through warranty expiration outreach
- Automatic reminders for stale estimates and late materials

**Future Enhancements (v2+)**:

- LLM integration for AI-generated task descriptions
- User-editable rules via UI (no code changes)
- Additional action types (Email, SMS, Slack notifications)
- Analytics dashboard (rules fired over time, effectiveness metrics)

See **[Workflow Automation](docs/13-workflow-automation.md)** for detailed documentation.

## 📊 Command Center & Role-Based Dashboards

**Phase 3 Sprint 6**: Unified operational overview aggregating critical metrics from across the entire platform for executives, production managers, safety officers, and finance teams.

**Features**:

- ✅ Real-time operational overview with role-based metric groupings
- ✅ Summary metrics (jobs in progress, high-risk jobs, safety incidents, workflow activity)
- ✅ Executive view (total jobs, jobs in progress, high-risk jobs, avg margin %)
- ✅ Production view (QC issues, delayed materials, scheduling risk)
- ✅ Safety view (open incidents, high severity incidents, incidents last 30 days)
- ✅ Finance view (low-margin jobs, low-margin + high-risk, total contract amount)
- ✅ Jobs needing attention table with multi-factor flagging
- ✅ Workflow activity snapshot with link to `/workflows`
- ✅ Subcontractor performance distribution (GREEN/YELLOW/RED)
- ✅ Warranties expiring soon and material orders delayed tracking

**API Endpoints**:

```
GET   /api/v1/command-center/overview              # Complete overview (summary, role views, attention jobs)
GET   /api/v1/command-center/jobs-needing-attention # Jobs list only
```

**Dashboard Routes**:

- `/command-center` - Unified operational overview with role-based sections

**Jobs Needing Attention Criteria**:

- High risk (HIGH level)
- QC failures with missing photos
- Open HIGH/CRITICAL safety incidents
- Material orders past expected delivery date
- Warranties expiring within 30 days
- Low margin (<10%) AND HIGH risk

**Performance**:

- <2 seconds response time for full overview
- Optimized Prisma aggregate queries
- Scales to 500-1000 active jobs
- Real-time data (no caching)

**Future Enhancements (v2+)**:

- Time-series charts (jobs, risk, margin trends)
- Real-time updates via WebSockets
- Custom dashboards with saved views
- Advanced filtering and date range selectors
- Per-role dedicated pages
- AI-powered insights and anomaly detection

See **[Command Center & Role-Based Dashboards](docs/14-command-center-and-role-dashboards.md)** for detailed documentation.

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

- ✅ Sprint 1: QuickBooks Accounting Integration (read-only, contract amount sync, accounting source tracking)
- ✅ Sprint 2: QuickBooks Reliability & Automation (OAuth2 token refresh, scheduled daily sync, UI sync controls)
- ✅ Sprint 3: Deployment & Environments (Vercel frontends, Railway backend, production-ready Dockerfile, environment docs)
- ✅ Sprint 4: AI Workflow Automation Engine v1 (8 rules, 6 departments, deduplication, JobNimbus integration, cron scheduling)
- ✅ Sprint 5: Workflow Automation Dashboard & Observability (internal `/workflows` page, filtering, manual execution controls)
- ✅ Sprint 6: Command Center & Role-Based Dashboards (unified operational overview, role views, jobs needing attention)
- ✅ Sprint 7: AI Dispatching & Field Optimization v1 (deterministic crew assignment, `/dispatch` dashboard, confidence scoring)
- ✅ Sprint 8: Staging Smoke Tests & Go-Live Checklist (automated health checks, deployment playbook, operational readiness)

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
