# Phase 1 Roadmap: Foundation & JobNimbus Integration

**Goal**: Build the foundational platform with JobNimbus integration, customer portal, QC system, and risk management.

## Sprint 1: Sync Engine & Core API (Weeks 1-2)

**Objective**: Establish bi-directional sync with JobNimbus and core backend infrastructure.

### Deliverables

- JobNimbus API client fully implemented in `@greenenergy/jobnimbus-sdk`
- Sync engine in `SyncModule` pulling jobs, contacts, and attachments
- Job CRUD endpoints in `JobModule`
- Initial database seeded with synced JobNimbus data
- Sync logs for audit trail

### Technical Tasks

- Implement all methods in `JobNimbusClient` class
- Build sync orchestration service
- Handle pagination and rate limiting
- Error handling and partial failure recovery
- Create sync scheduler (cron or manual trigger)

## Sprint 2: Customer Portal v1 (Weeks 3-4)

**Objective**: Launch customer-facing portal with magic link auth and project visibility.

### Deliverables

- Magic link email generation and validation
- Customer job dashboard showing project status
- Photo gallery with installation progress
- Timeline visualization
- Mobile-responsive design

### Technical Tasks

- Implement magic link token generation/validation
- Build job detail pages with tabs
- Integrate with `core-api` for data fetching
- Add email service for magic link delivery
- UI polish with `@greenenergy/ui` components

## Sprint 3: JobNimbus Write-Back (Weeks 5-6)

**Objective**: Enable writing data back to JobNimbus from our platform.

### Deliverables

- QC notes written back to JobNimbus
- Task creation in JobNimbus from internal dashboard
- Photo attachments uploaded to JobNimbus
- Sync log for all write operations

### Technical Tasks

- Implement `writeBackNoteToJobNimbus()` in `SyncService`
- Implement `writeBackTaskToJobNimbus()` in `SyncService`
- Add attachment upload functionality
- Build UI in internal dashboard for creating notes/tasks
- Sync status indicators

## Sprint 4: QC & Photo Module v1 (Weeks 7-8) ✅ COMPLETED

**Objective**: Ingest and classify job photos, implement QC rules engine, and push failures back to JobNimbus.

### Deliverables

- Photo ingestion and classification (BEFORE/DURING/AFTER)
- QC rules engine with 5/5/5 photo requirements
- QC results stored in database (QCPhotoCheck model)
- QC overview and detail pages in internal dashboard
- JobNimbus write-back for QC failures (notes + tasks)
- REST endpoints for photo sync and QC evaluation

### Technical Tasks

- ✅ Extended `JobNimbusClient` with `fetchJobPhotos()` method
- ✅ Implemented `PhotoService` with photo classification heuristics
- ✅ Implemented `QCService` with 5/5/5 rules engine
- ✅ Created QC REST endpoints: POST /qc/jobs/:id/evaluate, GET /qc/jobs/:id, GET /qc/jobs
- ✅ Created photo sync endpoint: POST /sync/photos
- ✅ Built QC overview page at /qc with job status table
- ✅ Built QC detail page at /qc/[jobId] with summary and photo counts
- ✅ Implemented JobNimbus write-back: creates notes and tasks for QC failures
- ✅ Added unit tests for photo classification and QC evaluation logic

## Sprint 5: Risk Dashboard v1 (Weeks 9-10) ✅ COMPLETED

**Objective**: Launch risk detection and alerting system for operational visibility.

### Deliverables

- Risk rule engine with configurable thresholds
- Rule-based risk evaluation (stuck status, missing QC, stale jobs)
- Job risk snapshots stored in database
- Risk dashboard with overview and detail pages
- Risk level indicators (LOW/MEDIUM/HIGH)
- JobNimbus deep links for external actions
- Internal links to QC and job details

### Technical Tasks

- ✅ Created `JobRiskSnapshot` model for persistent risk storage
- ✅ Implemented `RiskService` with multi-factor evaluation engine
- ✅ Risk rules: STUCK_IN_STATUS (7/14 day thresholds), MISSING_QC_PHOTOS, STALE_JOB (7/14 day thresholds)
- ✅ Added placeholder for MISSING_DOCUMENTS rule (for future implementation)
- ✅ Created REST endpoints: POST /risk/jobs/:id/evaluate, GET /risk/jobs/:id, GET /risk/jobs, POST /risk/evaluate-all
- ✅ Built risk overview page at /risk with table of all jobs, risk levels, and action links
- ✅ Built risk detail page at /risk/[jobId] with reasons, severity badges, and navigation
- ✅ Integrated JobNimbus deep links (configurable via JOBNIMBUS_APP_BASE_URL)
- ✅ Added unit tests for risk computation, threshold logic, and scenario validation

## Sprint 6: Embedded Panels for JobNimbus (Weeks 11-12) ✅ COMPLETED

**Objective**: Enable embedding of internal panels within JobNimbus using secure signed tokens.

### Deliverables

- Secure embed token generation with JWT signing
- Three embedded panel types: QC Panel, Risk View, Customer Portal Preview
- Minimal embed-friendly layouts (no navigation/sidebar)
- Token-based authentication for iframes
- Internal API endpoints for embed link generation
- Session resolution endpoint for token validation

### Technical Tasks

- ✅ Added `EmbeddedPanelType`, `EmbedSessionPayload`, `EmbedLinkResponse` types to shared-types
- ✅ Created `EmbedService` with JWT token signing/verification (HS256, configurable TTL)
- ✅ Created `EmbedController` with POST /api/v1/embed/links and GET /api/v1/embed/session/resolve
- ✅ Implemented `InternalApiKeyGuard` for protecting internal endpoints
- ✅ Built minimal embed layout for iframe-friendly display
- ✅ Created `/embed/qc` page with token resolution and QC data display
- ✅ Created `/embed/risk` page with token resolution and risk data display
- ✅ Created `/embed/portal` page with token resolution and portal preview
- ✅ Added GET /api/v1/portal/internal/jobs/:jobId endpoint for portal preview
- ✅ Added smoke tests for token signing, verification, and lifecycle
- ✅ Environment variables: EMBED_SIGNING_SECRET, EMBED_TOKEN_TTL_MINUTES, INTERNAL_DASHBOARD_BASE_URL

## Sprint 7: Final QA, Bug Fixes & Launch Readiness (Weeks 13-14) ✅ COMPLETED

**Objective**: Ensure Phase 1 is stable, documented, and production-ready.

### Deliverables

- Phase 1 health summary endpoint for monitoring
- Updated documentation for all features
- Final verification of build, lint, and tests
- Production environment configuration guide
- Launch readiness checklist

### Technical Tasks

- ✅ Added GET /health/phase-1 endpoint with summary of jobs, QC checks, risk snapshots, and portal sessions
- ✅ Updated JobNimbus integration guide with embedded panels documentation
- ✅ Updated Phase 1 roadmap with Sprint 6 & 7 details
- ✅ Verified all tests pass and codebase builds successfully
- ✅ Documented environment variables and configuration requirements

## Success Metrics

- JobNimbus sync runs without errors
- Customer portal adoption > 50% of active jobs
- QC review cycle time < 24 hours
- High-risk jobs flagged within 1 hour of detection

## Dependencies

- JobNimbus API access and credentials
- Email service for magic links (SendGrid/Mailgun)
- PostgreSQL database provisioned
- CI/CD pipeline operational
