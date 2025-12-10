# JobNimbus Integration Guide

## Overview

The Green Energy Platform integrates with JobNimbus as a hybrid system - using JobNimbus as the primary CRM while adding advanced capabilities on top.

## Integration Architecture

### Single Integration Point

All JobNimbus communication goes through `@greenenergy/jobnimbus-sdk` package.

```
Internal Dashboard → core-api → jobnimbus-sdk → JobNimbus API
Customer Portal → core-api → jobnimbus-sdk → JobNimbus API
                      ↓
                  Local Database (PostgreSQL)
```

### Data Flow Patterns

#### 1. Pull (JobNimbus → Our Platform)

**Use Case**: Sync jobs, contacts, and attachments from JobNimbus

**Implementation**:

```typescript
// In SyncService
async syncJobsFromJobNimbus() {
  // 1. Fetch jobs from JobNimbus
  const jnJobs = await this.jobNimbusClient.fetchJobs();

  // 2. Transform to our domain model
  const jobs = jnJobs.map(transformJobNimbusJob);

  // 3. Upsert into our database
  for (const job of jobs) {
    await prisma.job.upsert({
      where: { jobNimbusId: job.jobNimbusId },
      create: job,
      update: job,
    });
  }

  // 4. Log the sync
  await prisma.jobSyncLog.create({
    data: {
      jobId: job.id,
      syncType: 'PULL',
      status: 'SUCCESS',
      recordsAffected: jobs.length,
    },
  });
}
```

#### 2. Push (Our Platform → JobNimbus)

**Use Case**: Write QC notes, tasks, or updates back to JobNimbus

**Implementation**:

```typescript
// In SyncService
async writeBackNoteToJobNimbus(jobId: string, note: CreateNoteDto) {
  // 1. Get job's JobNimbus ID
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job?.jobNimbusId) throw new Error('Job not synced with JobNimbus');

  // 2. Create note in JobNimbus
  const result = await this.jobNimbusClient.createNote(job.jobNimbusId, note);

  // 3. Log the write-back
  await prisma.jobSyncLog.create({
    data: {
      jobId,
      syncType: 'PUSH',
      status: 'SUCCESS',
      recordsAffected: 1,
    },
  });

  return result;
}
```

#### 3. Mirroring Strategy

**Approach**: Keep a local copy of JobNimbus data for fast reads and advanced queries.

**Benefits**:

- Fast query performance (no API latency)
- Complex filtering and aggregations
- Offline capability
- Custom fields and relationships

**Sync Frequency**:

- **Initial sync**: Full data pull on first setup
- **Incremental sync**: Every 15 minutes (configurable)
- **Real-time updates**: Via webhook (if JobNimbus supports it)

## JobNimbus API Client (`@greenenergy/jobnimbus-sdk`)

### Configuration

**Environment Variables:**

- `JOBNIMBUS_BASE_URL` - JobNimbus API base URL (e.g., `https://api.jobnimbus.com`)
- `JOBNIMBUS_API_KEY` - Your JobNimbus API key
- `JOBNIMBUS_SYNC_CRON` - Cron expression for sync schedule (default: `*/15 * * * *`)
- `JOBNIMBUS_SYNC_ENABLED` - Enable/disable automatic syncing (default: `true`)

```typescript
const client = new JobNimbusClient({
  baseUrl: process.env.JOBNIMBUS_BASE_URL,
  apiKey: process.env.JOBNIMBUS_API_KEY,
  timeout: 30000,
});
```

### Available Methods

#### Fetching Data

```typescript
// Get jobs with pagination and optional date filtering
client.fetchJobs({ limit?: number; page?: number; updatedSince?: Date })

// Get a single job by ID
client.fetchJobById(jnid: string)

// Get contacts with pagination
client.fetchContacts({ limit?: number; page?: number; updatedSince?: Date })

// Get attachments for a job
client.fetchAttachments(jobId: string)

// Get photos for a job (with enhanced metadata for classification)
client.fetchJobPhotos(jobId: string)

// Health check
client.healthCheck()
```

#### Writing Data

```typescript
// Add a note to a job
client.createNote(jobId: string, { text: string; contactId?: string })

// Create a task
client.createTask(jobId: string, { title: string; description?: string; dueDate?: Date })

// Upload a file
client.uploadAttachment(jobId: string, { fileName: string; fileBuffer: Buffer; fileType: string })

// Update job status
client.updateJobStatus(jobId: string, status: string)
```

### Data Transformation

#### JobNimbus → Our Domain

```typescript
export function transformJobNimbusJob(jnJob: JobNimbusJob): Partial<Job> {
  return {
    jobNimbusId: jnJob.jnid,
    customerName: jnJob.display_name,
    address: jnJob.address,
    status: jnJob.status || 'LEAD',
    // Map other fields...
  };
}
```

#### Our Domain → JobNimbus

```typescript
// When creating a note
const notePayload: CreateNoteDto = {
  jobId: internalJobId,
  content: `QC Review: ${qcResult.status}`,
  createdBy: 'system',
};
```

## Sync Engine Design

### Sync Scheduler

```typescript
// Cron job every 15 minutes
@Cron('*/15 * * * *')
async handleSync() {
  await this.syncService.syncJobsFromJobNimbus();
}
```

### Error Handling

- **Network errors**: Retry with exponential backoff
- **Rate limiting**: Respect 429 responses, queue requests
- **Partial failures**: Log failed records, continue with others
- **Data conflicts**: Last-write-wins or manual review

### Sync Logs

All sync operations create `JobSyncLog` entries for audit trail:

```typescript
{
  jobId: string,
  syncType: 'PULL' | 'PUSH',
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL',
  recordsAffected: number,
  errorMessage?: string,
  createdAt: Date
}
```

## Webhooks (Future)

If JobNimbus supports webhooks:

1. Register webhook endpoint: `POST /api/v1/webhooks/jobnimbus`
2. Verify webhook signature
3. Process event (job.updated, contact.created, etc.)
4. Trigger targeted sync for affected records

## Authentication & Security

- API key stored in environment variable: `JOBNIMBUS_API_KEY`
- Never log API keys
- Use HTTPS only
- Rate limit our own API calls to JobNimbus
- Token rotation plan (if supported)

## REST API Endpoints

### Sync Endpoints

#### Trigger Manual Job Sync

```http
POST /api/v1/sync/jobs
Response: { fetched: number; created: number; updated: number; failed: number; errors: string[] }
```

#### Trigger Manual Contact Sync

```http
POST /api/v1/sync/contacts
Response: { fetched: number; created: number; updated: number; failed: number; errors: string[] }
```

#### Get Last Sync Summary

```http
GET /api/v1/sync/summary
Response: { jobId: string; syncType: string; status: string; recordsAffected: number; createdAt: Date }
```

#### Get Sync Logs

```http
GET /api/v1/sync/logs?limit=50&offset=0
Response: { logs: JobSyncLog[]; total: number }
```

#### Trigger Photo Sync

```http
POST /api/v1/sync/photos
POST /api/v1/sync/photos?jobId=xxx (single job)
POST /api/v1/sync/photos?limit=10 (limit number of jobs)
Response: { total: number; succeeded: number; failed: number; errors: Array<{jobId, error}>; totalPhotosSynced: number }
```

### QC Endpoints

#### Evaluate QC for Job

```http
POST /api/v1/qc/jobs/:jobId/evaluate
Response: { jobId: string; status: 'PASS'|'FAIL'|'NOT_CHECKED'; checkedAt: Date; totalPhotos: {BEFORE:number, DURING:number, AFTER:number}; missingCategories: Array<{category, required, current, missing}>; jobNimbusSyncedAt?: Date }
```

#### Evaluate QC for All Jobs

```http
POST /api/v1/qc/evaluate-all
Response: { total: number; succeeded: number; failed: number; errors: Array<{jobId, error}> }
```

#### Get QC Result for Job

```http
GET /api/v1/qc/jobs/:jobId
Response: QCCheckResult | null
```

#### Get QC Overview

```http
GET /api/v1/qc/jobs
Response: Array<{ jobId: string; jobName: string; qcStatus: string; totalPhotos: number; beforeCount: number; duringCount: number; afterCount: number; lastCheckedAt?: Date }>
```

### Risk Endpoints

#### Evaluate Risk for Job

```http
POST /api/v1/risk/jobs/:jobId/evaluate
Response: JobRiskSnapshotDTO with riskLevel, reasons[], jobNimbusUrl, etc.
```

#### Evaluate Risk for All Jobs

```http
POST /api/v1/risk/evaluate-all
Response: { totalJobs: number; evaluated: number; errors: string[] }
```

#### Get Risk Snapshot for Job

```http
GET /api/v1/risk/jobs/:jobId
Response: JobRiskSnapshotDTO | 404
```

#### Get All Risk Snapshots

```http
GET /api/v1/risk/jobs
Response: JobRiskSnapshotDTO[]
```

### Integration Endpoints

#### JobNimbus Health Check

```http
GET /api/v1/integration/jobnimbus/health
Response: { status: 'ok' | 'error'; message?: string }
```

## Risk Dashboard & JobNimbus Integration

The Risk Dashboard evaluates jobs based on multiple operational factors and provides deep links to JobNimbus for external actions.

### Risk Evaluation Rules

The risk engine uses the following rules (configurable via environment variables):

1. **STUCK_IN_STATUS**: Job has been in current status for too long
   - Medium risk: >= 7 days (configurable: `RISK_STUCK_STATUS_DAYS_MEDIUM`)
   - High risk: >= 14 days (configurable: `RISK_STUCK_STATUS_DAYS_HIGH`)

2. **MISSING_QC_PHOTOS**: Latest QC check status is FAIL
   - High risk: Missing required photos in any category
   - Integrates with QC engine to detect gaps

3. **STALE_JOB**: Job has not been updated recently
   - Medium risk: >= 7 days since last update (configurable: `RISK_STALE_JOB_DAYS_MEDIUM`)
   - High risk: >= 14 days since last update (configurable: `RISK_STALE_JOB_DAYS_HIGH`)

4. **MISSING_DOCUMENTS**: Required documents not uploaded
   - Status: Not yet implemented (placeholder for future document model)
   - Intended severity: Medium/High when document model is added

### JobNimbus Deep Links

Risk snapshots include `jobNimbusUrl` field for direct navigation to JobNimbus:

**Configuration:**

```env
JOBNIMBUS_APP_BASE_URL="https://app.jobnimbus.com"
```

**URL Pattern:**

```
${JOBNIMBUS_APP_BASE_URL}/job/${jobNimbusId}
```

**Example:**

```
https://app.jobnimbus.com/job/12345
```

These links are displayed in:

- Risk overview table (`/risk`)
- Risk detail page (`/risk/[jobId]`)
- Enable users to quickly jump from internal risk dashboard to JobNimbus CRM

### Risk Data Sources

The risk engine uses JobNimbus-synced data:

- **Job status and timestamps**: From `Job.status`, `Job.updatedAt`
- **QC results**: From `QCPhotoCheck` table (which references JobNimbus photos)
- **Customer info**: From `Job.customerName` (synced from JobNimbus)
- **Job numbers**: From `Job.jobNimbusId` (external JobNimbus identifier)

## Initial Data Import

Use the seed script to import existing JobNimbus data:

```bash
# From the repo root
pnpm seed:jobnimbus
```

This script:

- Fetches all jobs and contacts from JobNimbus with pagination
- Upserts records into PostgreSQL
- Logs progress and errors
- Handles missing API key gracefully

## Testing Strategy

### Unit Tests

- ✅ `JobNimbusClient` methods fully tested with `nock` HTTP mocking
- ✅ Error handling for auth errors, rate limits, network failures
- ✅ Pagination logic validated
- 📝 TODO: Add tests for `SyncService` (mock JobNimbus client)

### Integration Tests

- Test against JobNimbus sandbox (if available)
- Verify sync end-to-end
- Test write-back operations

### Manual Testing

- Sync real jobs from production JobNimbus via seed script
- Create notes in dashboard, verify in JobNimbus
- Upload photo, check it appears in JobNimbus

## Troubleshooting

### Common Issues

**Issue**: Sync fails with "Unauthorized"

- **Solution**: Check API key validity, regenerate if needed

**Issue**: Some jobs not syncing

- **Solution**: Check filters in `fetchJobs()`, review sync logs

**Issue**: Write-back note not appearing

- **Solution**: Verify job has `jobNimbusId`, check JobNimbus UI

**Issue**: Rate limit errors (429)

- **Solution**: Reduce sync frequency, implement queuing

## Performance Considerations

- **Pagination**: Fetch jobs in batches of 100
- **Caching**: Cache frequently-accessed JobNimbus data
- **Async**: Use background jobs for large syncs
- **Monitoring**: Track sync duration and error rates

## Embedded Panels for JobNimbus

Phase 1 Sprint 6 introduced embedded panels that can be displayed within JobNimbus iframes, providing internal teams with contextual views of QC status, risk analysis, and customer portal previews.

### Overview

Embedded panels use short-lived signed tokens to securely display internal data within JobNimbus, eliminating the need for separate logins.

### Panel Types

1. **QC Panel** (`QC_PANEL`)
   - Displays QC summary, photo counts, and missing requirements
   - Route: `/embed/qc?token=...`

2. **Risk View** (`RISK_VIEW`)
   - Shows risk level, risk reasons, and recommended actions
   - Route: `/embed/risk?token=...`

3. **Customer Portal Preview** (`CUSTOMER_PORTAL_VIEW`)
   - Preview of what customers see in their portal
   - Route: `/embed/portal?token=...`

### Authentication Flow

1. JobNimbus (or internal system) requests an embed link:
   ```http
   POST /api/v1/embed/links
   Headers:
     x-internal-api-key: {{INTERNAL_API_KEY}}
   Body:
     { "jobId": "abc123", "panelType": "QC_PANEL" }
   ```

2. Backend generates a signed JWT token:
   ```json
   {
     "url": "http://localhost:3002/embed/qc?token=eyJhbGc...",
     "panelType": "QC_PANEL",
     "jobId": "abc123",
     "expiresAt": "2024-01-01T12:30:00Z"
   }
   ```

3. JobNimbus displays the URL in an iframe

4. Dashboard resolves the token and displays the panel:
   ```http
   GET /api/v1/embed/session/resolve?token=eyJhbGc...
   Response: { "jobId": "abc123", "panelType": "QC_PANEL", "exp": 1234567890 }
   ```

### Configuration

**Environment Variables:**

- `EMBED_SIGNING_SECRET` - Secret key for signing JWT tokens (required in production)
- `EMBED_TOKEN_TTL_MINUTES` - Token expiration time (default: 30 minutes)
- `INTERNAL_DASHBOARD_BASE_URL` - Base URL for embed routes (default: http://localhost:3002)
- `INTERNAL_API_KEY` - API key for protecting internal endpoints

### Security Features

- **Signed tokens**: JWT tokens signed with HS256 algorithm
- **Time-limited**: Tokens expire after configurable TTL (default 30 minutes)
- **Job validation**: Tokens are only valid if the job exists in the database
- **Internal API key**: Link generation endpoint protected by API key
- **No session required**: Tokens are self-contained, no server-side session storage

### Embed Layout

Embedded panels use a minimal layout without navigation, sidebar, or header:

- No authentication UI
- No navigation menu
- Optimized for iframe embedding
- Responsive design for various panel sizes

### API Endpoints

#### Generate Embed Link

```http
POST /api/v1/embed/links
Headers:
  x-internal-api-key: {{INTERNAL_API_KEY}}
Body:
  {
    "jobId": "abc123",
    "panelType": "QC_PANEL" | "RISK_VIEW" | "CUSTOMER_PORTAL_VIEW"
  }
Response:
  {
    "url": "http://localhost:3002/embed/qc?token=...",
    "panelType": "QC_PANEL",
    "jobId": "abc123",
    "expiresAt": "2024-01-01T12:30:00Z"
  }
```

#### Resolve Embed Session

```http
GET /api/v1/embed/session/resolve?token=eyJhbGc...
Response:
  {
    "jobId": "abc123",
    "panelType": "QC_PANEL",
    "exp": 1234567890
  }
```

#### Internal Portal Preview

```http
GET /api/v1/portal/internal/jobs/:jobId
Headers:
  x-internal-api-key: {{INTERNAL_API_KEY}}
Response: PortalJobView (same schema as customer portal)
```

### Usage Example

```typescript
// Request an embed link from your integration
const response = await fetch('http://localhost:3000/api/v1/embed/links', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-api-key': process.env.INTERNAL_API_KEY,
  },
  body: JSON.stringify({
    jobId: 'abc123',
    panelType: 'QC_PANEL',
  }),
});

const { url } = await response.json();

// Display in iframe
<iframe src={url} width="100%" height="600" />
```

### Testing

Smoke tests for embedded panels are located in:
- `apps/core-api/src/modules/embed/embed.service.spec.ts`

Tests cover:
- Token generation and verification
- Token expiration
- Signature validation
- Embed link generation for all panel types
- Session resolution with job validation

## Future Enhancements

- Real-time sync via webhooks
- Conflict resolution UI for data mismatches
- Selective sync (only active jobs)
- Custom field mapping configuration
- Bi-directional status sync automation
- Enhanced embed panels with interactive features
- SSO integration for customer portal access from JobNimbus
