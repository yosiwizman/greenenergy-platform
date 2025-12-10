# Accounting & QuickBooks Integration (Phase 3 Sprint 1)

## Overview

The Accounting Integration module connects the Green Energy Platform with QuickBooks Online to sync **real financial data** into the Profit Dashboard. This v1 implementation is read-only and focuses on syncing **contract amounts** from QuickBooks invoices to replace placeholder calculations.

**Key Features:**

- ✅ QuickBooks Online API integration (read-only)
- ✅ Automated sync of contract amounts from QB invoices
- ✅ Accounting source tracking (PLACEHOLDER, QUICKBOOKS, MANUAL)
- ✅ Sync timestamp tracking
- ✅ Configurable via environment variables
- ✅ Error-resilient batch sync
- ✅ UI indicators showing data source

## Architecture

### Data Model

The `JobFinancialSnapshot` model is extended with accounting metadata:

```prisma
model JobFinancialSnapshot {
  // ... existing fields ...
  
  // Accounting metadata (Phase 3 Sprint 1)
  accountingSource    String?   // 'PLACEHOLDER' | 'QUICKBOOKS' | 'MANUAL'
  accountingLastSyncAt DateTime?
  
  @@index([accountingSource])
}
```

### QuickBooks Mapping

- **Job Identifier**: `Job.jobNimbusId` maps to `QuickBooks Invoice.DocNumber`
- **Contract Amount**: `QuickBooks Invoice.TotalAmt` becomes `JobFinancialSnapshot.contractAmount`
- **Multiple Invoices**: If multiple invoices match, the latest by `TxnDate` is used
- **No Match**: Job retains placeholder calculation or existing data

### Accounting Source Semantics

| Source | Meaning | Behavior |
|--------|---------|----------|
| `PLACEHOLDER` | Calculated using systemSize * $3.50/W | ProfitabilityService can overwrite `contractAmount` |
| `QUICKBOOKS` | Synced from QuickBooks invoice | ProfitabilityService preserves `contractAmount` from QB |
| `MANUAL` | Manually entered by user (future) | Reserved for future manual entry feature |

## Configuration

### Environment Variables

Add to `.env` or `.env.local`:

```bash
# QuickBooks Integration
QB_ENABLED=true                          # Enable/disable QuickBooks sync
QB_BASE_URL=https://quickbooks.api.intuit.com  # QuickBooks API base URL
QB_COMPANY_ID=your_company_id            # QuickBooks Company ID (Realm ID)
QB_CLIENT_ID=your_client_id              # OAuth2 Client ID (future OAuth)
QB_CLIENT_SECRET=your_client_secret      # OAuth2 Client Secret (future OAuth)
QB_ACCESS_TOKEN=your_access_token        # Current access token (manual refresh for v1)
QB_REFRESH_TOKEN=your_refresh_token      # Refresh token (future OAuth)
```

**For v1:**
- Full OAuth2 flow is not implemented
- `QB_ACCESS_TOKEN` must be refreshed manually when expired (typically 1 hour)
- Future enhancement: Automatic token refresh using `QB_REFRESH_TOKEN`

### Disabling QuickBooks

Set `QB_ENABLED=false` or omit it entirely. All sync operations will:
- Log warnings about QB being disabled
- Create or preserve PLACEHOLDER snapshots
- Never make network requests

## API Endpoints

### Internal Sync Endpoints

All endpoints require `x-internal-api-key` header for authentication.

#### POST /api/v1/accounting/jobs/:jobId/sync

Sync a single job's financial data from QuickBooks.

**Response:**
```json
{
  "jobId": "cuid123",
  "contractAmount": 45000,
  "accountingSource": "QUICKBOOKS",
  "accountingLastSyncAt": "2024-01-15T10:30:00.000Z"
}
```

**Behavior:**
- Fetches QuickBooks invoice matching `job.jobNimbusId`
- Updates `JobFinancialSnapshot` with real contract amount
- Recomputes margin based on existing cost data
- Sets `accountingSource = 'QUICKBOOKS'` and sync timestamp
- Falls back to PLACEHOLDER if no invoice found

#### POST /api/v1/accounting/sync-all

Sync all active jobs from QuickBooks in batch.

**Response:**
```json
{
  "success": true,
  "message": "Sync completed. Check logs for details."
}
```

**Behavior:**
- Queries all jobs with status NOT IN ('COMPLETE', 'CANCELLED', 'LOST')
- Syncs each job sequentially
- Continues processing if individual jobs fail
- Logs success/error counts at completion

### Profit Dashboard Endpoints

Existing profit endpoints now include accounting metadata:

#### GET /api/v1/profit/dashboard/jobs

Returns jobs with `accountingSource` and `accountingLastSyncAt`:

```json
[
  {
    "jobId": "cuid123",
    "jobNumber": "J-1001",
    "customerName": "John Doe",
    "status": "ACTIVE",
    "contractAmount": 45000,
    "marginPercent": 25,
    "profitabilityLevel": "HIGH",
    "accountingSource": "QUICKBOOKS",
    "accountingLastSyncAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## Integration with Profit Dashboard

### Service Behavior

**ProfitabilityService.recalculateJobFinancialSnapshot():**

- **Before Phase 3**: Always overwrites `contractAmount` with placeholder calculation
- **After Phase 3**: 
  - If `accountingSource === 'QUICKBOOKS'`: Preserves existing `contractAmount`
  - Otherwise: Uses placeholder calculation and sets `accountingSource = 'PLACEHOLDER'`

### UI Features

The `/profit` dashboard now displays:

1. **Accounting Source Column**: Badge showing PLACEHOLDER, QuickBooks, or Manual
2. **Sync Timestamp**: Date of last QuickBooks sync (if applicable)
3. **Sync Button**: "Sync QB" button for non-QuickBooks jobs to trigger manual sync

**Badge Colors:**
- PLACEHOLDER: Gray
- QUICKBOOKS: Blue
- MANUAL: Purple

## Usage Workflows

### Initial Setup

1. Configure environment variables in `.env`
2. Obtain QuickBooks access token (manual process for v1)
3. Test connection: `POST /api/v1/accounting/sync-all`
4. Verify sync results in `/profit` dashboard

### Regular Sync

**Option A: Scheduled Sync (Recommended)**
- Add cron job or scheduled task to call `/api/v1/accounting/sync-all`
- Frequency: Daily or weekly depending on data freshness needs

**Option B: On-Demand Sync**
- Use UI "Sync QB" button for individual jobs
- Use "Refresh" button on dashboard (does NOT trigger sync)

### Monitoring

- Check application logs for sync results:
  - `[AccountingService] Syncing job {jobId} from QuickBooks`
  - `[AccountingService] Found QuickBooks invoice...`
  - `[AccountingService] No QuickBooks invoice found...`
- Monitor error counts in sync-all logs
- Review `accountingLastSyncAt` timestamps in UI

## Error Handling

### QuickBooks API Errors

- **Network failures**: Logged, returns null (no crash)
- **Invalid credentials**: Logged, returns null
- **Rate limiting**: Not handled in v1 (future enhancement)
- **Invoice not found**: Normal behavior, creates PLACEHOLDER snapshot

### Missing Data

- **Job without jobNimbusId**: Cannot sync, creates PLACEHOLDER
- **Invoice.TotalAmt = 0**: Syncs as $0 contract amount
- **Multiple invoices**: Uses latest by TxnDate

### Sync Failures

- Individual job failures do NOT abort batch sync
- Errors logged per job with job ID
- Sync-all returns overall success/failure counts

## Future Enhancements

### Phase 3 Sprint 2+

- **Full OAuth2 Flow**: Automatic token refresh, no manual token management
- **Cost Breakdown**: Sync labor, materials, permits from QB
- **Multi-Invoice Support**: Handle jobs with multiple invoices or estimates
- **Time-Series Tracking**: Historical contract amount changes
- **Change Orders**: Sync change order amounts separately
- **Manual Entry UI**: Allow MANUAL source with internal form
- **Webhook Integration**: Real-time sync on QB invoice changes
- **Reconciliation Report**: Compare QB vs. platform data

### Other Accounting Systems

- **Xero**: Alternative to QuickBooks
- **Sage Intacct**: Enterprise accounting
- **Custom CSV Import**: For legacy or non-integrated systems

## Troubleshooting

### "QuickBooks integration is DISABLED"

- **Cause**: `QB_ENABLED` is false or missing
- **Fix**: Set `QB_ENABLED=true` in environment

### "QuickBooks credentials incomplete"

- **Cause**: `QB_COMPANY_ID` or `QB_ACCESS_TOKEN` missing
- **Fix**: Add credentials to environment variables

### "No QuickBooks invoice found"

- **Cause**: 
  - Invoice `DocNumber` doesn't match `job.jobNimbusId`
  - Job has no `jobNimbusId`
  - Invoice not yet created in QuickBooks
- **Fix**: 
  - Verify job number matches QB invoice
  - Create invoice in QuickBooks with matching `DocNumber`
  - Accept PLACEHOLDER for jobs without invoices

### Margin calculations incorrect after sync

- **Cause**: Costs (estimatedCost, actualCost) may be stale
- **Fix**: Update cost data via future cost sync feature

### Access token expired (401 errors)

- **Cause**: QB access tokens expire after 1 hour
- **Fix**: 
  - Manually refresh token in QuickBooks OAuth Playground
  - Update `QB_ACCESS_TOKEN` in environment
  - Restart application
  - Future: Implement automatic token refresh

## Testing

### Unit Tests

Located in `apps/core-api/src/modules/accounting/__tests__/`:

- `accounting.service.spec.ts`: 7 test scenarios covering sync logic
- Tests use mocked `QuickbooksClient` and Prisma

### Test Scenarios Covered

1. Job not found → NotFoundException
2. Job without jobNimbusId → PLACEHOLDER
3. QuickBooks disabled → PLACEHOLDER
4. Invoice found → QUICKBOOKS with real amount
5. Existing QB snapshot, no invoice → fallback to PLACEHOLDER
6. Batch sync all active jobs
7. Batch sync continues on individual job failures

### Running Tests

```bash
pnpm test                                 # All tests
pnpm --filter @greenenergy/core-api test  # Core API tests only
```

## Security Considerations

- **API Keys**: Internal endpoints protected by `InternalApiKeyGuard`
- **Access Tokens**: Never log or expose QB tokens in responses
- **Environment Variables**: Keep `.env` out of version control
- **Rate Limiting**: Not implemented in v1 (future enhancement)
- **Data Privacy**: Only reads financial data, no PII from QuickBooks

## Performance

- **Sync Duration**: ~100-500ms per job (network dependent)
- **Batch Sync**: Sequential processing (future: parallel with concurrency limit)
- **Caching**: None in v1 (future: Redis cache for QB responses)
- **Database Impact**: 1 read + 1 upsert per job

## Changelog

### Phase 3 Sprint 1 (Current)

- ✅ Initial QuickBooks integration (read-only)
- ✅ Contract amount sync
- ✅ Accounting source tracking
- ✅ Profit dashboard UI enhancements
- ✅ Sync endpoints (single + batch)
- ✅ Test coverage (7 scenarios)

### Planned

- ⏳ OAuth2 token refresh automation
- ⏳ Cost breakdown sync
- ⏳ Multi-invoice support
- ⏳ Webhook integration
