# Green Energy Platform Architecture

## Overview

The Green Energy Platform is a hybrid JobNimbus integration that enhances solar installation operations with advanced QC, risk management, and operational intelligence.

## Monorepo Structure

We use a **pnpm + Turborepo monorepo** to manage all applications and shared packages in a single repository.

```
greenenergy-platform/
├─ apps/
│  ├─ core-api/             # NestJS backend
│  ├─ customer-portal/      # Next.js 14 customer-facing portal
│  └─ internal-dashboard/   # Next.js 14 ops dashboard
├─ packages/
│  ├─ db/                   # Prisma + PostgreSQL client
│  ├─ jobnimbus-sdk/        # JobNimbus API integration
│  ├─ shared-types/         # Domain types
│  ├─ ui/                   # React component library
│  └─ config/               # Shared configs
└─ infra/                   # Infrastructure code
```

## Applications

### apps/core-api (NestJS Backend)

**Purpose**: Central API that orchestrates all business logic and integrations.

**Key Responsibilities**:

- JobNimbus sync engine (bi-directional)
- Job and project management
- QC rules and photo analysis
- Risk detection and flagging
- Subcontractor scoring
- Safety and warranty tracking
- Material ETA management

**Technology Stack**:

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **API Style**: RESTful JSON
- **External Integration**: JobNimbus via `@greenenergy/jobnimbus-sdk`

**Modules**:

- `JobModule` - Job CRUD and queries
- `SyncModule` - JobNimbus sync engine
- `PhotoModule` - Photo metadata and QC
- `QCModule` - QC rules and results (Phase 1 Sprint 4)
- `RiskModule` - Risk flags and scoring (Phase 1 Sprint 5)
- `SubcontractorModule` - Subcontractor directory (Phase 2 Sprint 1)
- `SafetyModule` - Safety forms and incidents (Phase 2 Sprint 2)
- `WarrantyModule` - Warranty tracking (Phase 2 Sprint 3)
- `MaterialModule` - Material ETA tracking (Phase 2 Sprint 4)

### apps/customer-portal (Next.js 14)

**Purpose**: Customer-facing portal for project transparency.

**Key Features**:

- Magic link authentication (no passwords)
- Real-time project status tracking
- Photo gallery with installation progress
- Document downloads (permits, contracts, etc.)
- Timeline and milestone visualization

**Technology Stack**:

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + `@greenenergy/ui`
- **Auth**: Magic link tokens (Phase 1 Sprint 2)

### apps/internal-dashboard (Next.js 14)

**Purpose**: Operations and management dashboard for internal teams.

**Key Features**:

- Command center with real-time metrics
- Job list with risk indicators
- QC panel for photo review
- Risk dashboard with alert management
- Subcontractor directory and scoring
- Safety incident tracking
- Warranty and material management

**Technology Stack**:

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + `@greenenergy/ui`
- **Charts**: (TBD - Phase 2+)

## Shared Packages

### packages/db (Database Layer)

**Prisma ORM** with PostgreSQL schema defining 12 models:

- Job, Contact, JobSyncLog
- PhotoMetadata, QCResult, RiskFlag
- CustomerUser, Subcontractor, SafetyIncident
- Warranty, MaterialOrder, SystemConfig

All apps and services import the Prisma client from this package.

### packages/jobnimbus-sdk (Integration Layer)

Typed API client for JobNimbus:

- Fetch jobs, contacts, attachments
- Create notes and tasks
- Upload files
- Transform JobNimbus data to our domain models

This is the **single integration point** with JobNimbus.

### packages/shared-types (Type Definitions)

Domain enums and interfaces used across all apps:

- `JobStatus`, `QCStatus`, `RiskLevel`
- `Job`, `Contact`, `QCResult`, `RiskFlag`, etc.
- DTOs for API requests

### packages/ui (Component Library)

Shared React components with Tailwind CSS:

- `Button`, `Card`, `Table`, `Badge`
- `StatusPill` (job/QC/risk status indicators)
- `LayoutShell` (sidebar + header layout)

Used by both Next.js frontends for consistent UX.

### packages/config (Shared Configuration)

Centralized configuration for:

- ESLint rules
- Prettier formatting
- TypeScript compiler options
- Tailwind CSS theme (green energy colors, risk colors)

## Data Flow

### JobNimbus Sync (Pull)

1. `SyncService` calls `jobNimbusClient.fetchJobs()`
2. Transform JobNimbus data to our domain models
3. Upsert jobs into PostgreSQL
4. Create `JobSyncLog` entries

### JobNimbus Write-Back (Push)

1. Internal dashboard creates QC note or task
2. `SyncService` calls `jobNimbusClient.createNote()` or `.createTask()`
3. JobNimbus updated with our data
4. Create `JobSyncLog` entry

### Customer Portal Access

1. Customer receives magic link via email
2. Token validated against `CustomerUser` table
3. Customer views job details, photos, and documents
4. All data fetched from `core-api`

## Phase Mapping

### Phase 1: Foundation & JobNimbus Integration

- **Sprint 1**: Sync engine + core API
- **Sprint 2**: Customer portal v1
- **Sprint 3**: JobNimbus write-back
- **Sprint 4**: QC v1
- **Sprint 5**: Risk dashboard v1

### Phase 2: Operational Excellence

- **Sprint 1**: Subcontractor directory
- **Sprint 2**: Safety tracking
- **Sprint 3**: Warranty management
- **Sprint 4**: Material ETA tracking
- **Sprint 5**: AI Ops v1 (photo analysis, risk prediction)

### Phase 3: Automation & Intelligence

- **Sprint 1**: Automation engine
- **Sprint 2**: Intelligent dispatching
- **Sprint 3**: Finance integrations
- **Sprint 4**: Forecasting & analytics
- **Sprint 5**: Command center v2

## Deployment Architecture

(To be determined - hosting provider TBD)

**Likely setup**:

- **Backend**: Docker container (ECS / Cloud Run / Azure App Service)
- **Frontends**: Vercel / Netlify / S3 + CloudFront
- **Database**: Managed PostgreSQL (RDS / Cloud SQL / Azure Database)
- **Caching**: Redis (ElastiCache / Memorystore)
- **CI/CD**: GitHub Actions

All infrastructure defined in `infra/terraform/` once provider is chosen.

## Security Considerations

- Magic link tokens expire after 24 hours
- Database credentials via environment variables
- JobNimbus API key stored securely
- HTTPS everywhere in production
- CORS configured for known origins only

## Local Development

See root `README.md` for setup instructions.

**Prerequisites**:

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

**Quick Start**:

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose -f infra/docker/docker-compose.yml up -d

# Generate Prisma client
pnpm --filter @greenenergy/db db:generate

# Run migrations
pnpm --filter @greenenergy/db db:migrate

# Start all apps in dev mode
pnpm dev
```
