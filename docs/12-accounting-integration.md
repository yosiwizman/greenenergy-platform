# Accounting & QuickBooks Integration (Phase 3 Sprint 1 & 2)

## Overview

The Accounting Integration module connects the Green Energy Platform with QuickBooks Online to sync **real financial data** into the Profit Dashboard. The integration is read-only and focuses on syncing **contract amounts** from QuickBooks invoices to replace placeholder calculations.

**Key Features:**

- ✅ QuickBooks Online API integration (read-only)
- ✅ OAuth2 automatic token refresh (Phase 3 Sprint 2)
- ✅ Automated sync of contract amounts from QB invoices
- ✅ Scheduled daily sync (configurable)
- ✅ Accounting source tracking (PLACEHOLDER, QUICKBOOKS, MANUAL)
- ✅ Sync timestamp tracking
- ✅ Configurable via environment variables
- ✅ Error-resilient batch sync
- ✅ UI indicators showing data source
- ✅ Manual sync controls in dashboard

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

# OAuth2 Credentials (Phase 3 Sprint 2)
QB_CLIENT_ID=your_client_id              # OAuth2 Client ID
QB_CLIENT_SECRET=your_client_secret      # OAuth2 Client Secret
QB_REFRESH_TOKEN=your_refresh_token      # Refresh token (from initial OAuth flow)
QB_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer  # OAuth token endpoint

# Fallback Token (optional)
QB_ACCESS_TOKEN=your_access_token        # Fallback access token (if OAuth2 not configured)

# Scheduled Sync (Phase 3 Sprint 2)
QB_SYNC_ENABLED=true                     # Enable automatic daily sync at 2 AM
```

**OAuth2 Token Management (Phase 3 Sprint 2):**
- ✅ Automatic token refresh using `QB_REFRESH_TOKEN`
- ✅ Token caching in memory (expires 5 minutes before actual expiry)
- ✅ Fallback to `QB_ACCESS_TOKEN` if OAuth2 credentials not configured
- ✅ Graceful error handling with detailed logging

**Initial Setup:**
1. Obtain initial `QB_REFRESH_TOKEN` via QuickBooks OAuth2 flow (manual, one-time)
2. Configure OAuth2 credentials in environment
3. Application automatically refreshes access tokens as needed
4. No manual token management required after initial setup

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

**Option A: Automatic Scheduled Sync (Recommended) - Phase 3 Sprint 2**
- Built-in daily sync at 2 AM
- Enable with `QB_SYNC_ENABLED=true` in environment
- Runs automatically via NestJS `@Cron` scheduler
- Processes all active jobs (excludes COMPLETE, CANCELLED, LOST)
- Error-resilient: continues processing even if individual jobs fail
- Logs success/error counts at completion

**Option B: Manual Sync from Dashboard**
- **Sync All Button**: Triggers batch sync for all active jobs
- **Per-Job Sync Button**: Syncs individual job on demand
- Both buttons show loading states while syncing
- Auto-refreshes data after sync completes

**Option C: API-Triggered Sync**
- Call `POST /api/v1/accounting/sync-all` via external scheduler/cron
- Call `POST /api/v1/accounting/jobs/:jobId/sync` for individual jobs
- Requires `x-internal-api-key` header

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

## AR & Payment Tracking (Phase 5 Sprint 1)

### Overview

The Accounts Receivable (AR) module extends the QuickBooks integration to sync **payment data** and compute AR status for each job. This provides real-time visibility into outstanding balances, payment history, and overdue invoices.

**Key Features:**

- ✅ Payment sync from QuickBooks
- ✅ AR status computation (PAID, PARTIALLY_PAID, UNPAID, OVERDUE)
- ✅ Amount paid and outstanding tracking
- ✅ Invoice due date tracking
- ✅ Finance API endpoints for AR visibility
- ✅ Finance dashboard with AR summary and job-level details
- ✅ Integration with daily QuickBooks sync

### Data Model Extensions

#### Payment Model

New `Payment` model tracks individual payments received:

```prisma
model Payment {
  id                 String   @id @default(cuid())
  jobId              String
  job                Job      @relation(fields: [jobId], references: [id])
  externalId         String   @unique // QuickBooks payment ID
  externalInvoiceId  String?  // QuickBooks invoice ID
  amount             Float
  receivedAt         DateTime
  paymentMethod      String?  // 'CREDIT_CARD' | 'CHECK' | 'ACH' | 'WIRE' | 'OTHER'
  status             String   // 'APPLIED' | 'PENDING' | 'REVERSED'
  referenceNumber    String?  // Check number, transaction ID, etc.
  notes              String?
  
  @@index([jobId])
  @@index([receivedAt])
  @@index([status])
}
```

#### JobFinancialSnapshot Extensions

AR tracking fields added to existing snapshot:

```prisma
model JobFinancialSnapshot {
  // ... existing fields ...
  
  // AR tracking (Phase 5 Sprint 1)
  amountPaid        Float?    @default(0)
  amountOutstanding Float?    @default(0)
  arStatus          String?   // 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE'
  lastPaymentAt     DateTime?
  invoiceDueDate    DateTime?
  
  @@index([arStatus])
}
```

### AR Status Logic

The `arStatus` field is computed based on payment data and due dates:

| Status | Condition |
|--------|----------|
| `PAID` | `amountOutstanding <= 0` (fully paid) |
| `PARTIALLY_PAID` | `amountPaid > 0` AND `amountOutstanding > 0` |
| `UNPAID` | `amountPaid = 0` AND `amountOutstanding > 0` |
| `OVERDUE` | `invoiceDueDate < today` AND `amountOutstanding > 0` (takes precedence) |

### QuickBooks Payment Sync

**AccountingService Integration:**

The existing `syncJobFromQuickbooks()` method now:

1. Fetches invoice from QuickBooks
2. Fetches all payments linked to that invoice
3. Upserts `Payment` records (keyed by `externalId`)
4. Computes `amountPaid` and `amountOutstanding`
5. Determines `arStatus` based on logic above
6. Updates `JobFinancialSnapshot` with AR fields

**Payment Method Mapping:**

- QuickBooks `PaymentMethodRef.name` → Platform `paymentMethod` enum
- "Check" → `CHECK`
- "Credit Card" / "Card" → `CREDIT_CARD`
- "ACH" / "Bank" → `ACH`
- "Wire" → `WIRE`
- Other → `OTHER`

### Finance API Endpoints

New internal finance API endpoints (protected by `InternalApiKeyGuard`):

#### GET /api/v1/finance/ar/summary

Returns aggregated AR metrics:

```json
{
  "totalOutstanding": 250000,
  "totalPaid": 500000,
  "totalContractValue": 750000,
  "jobsPaid": 10,
  "jobsPartiallyPaid": 5,
  "jobsUnpaid": 3,
  "jobsOverdue": 2
}
```

#### GET /api/v1/finance/ar/jobs

Returns list of jobs with AR details. Optional query param: `?status=OVERDUE|UNPAID|PARTIALLY_PAID|PAID`

```json
[
  {
    "jobId": "cuid123",
    "jobNumber": "J-1001",
    "customerName": "John Doe",
    "status": "IN_PROGRESS",
    "contractAmount": 50000,
    "amountPaid": 25000,
    "amountOutstanding": 25000,
    "arStatus": "PARTIALLY_PAID",
    "lastPaymentAt": "2024-01-15T10:00:00.000Z",
    "invoiceDueDate": "2024-02-15T00:00:00.000Z",
    "payments": [
      {
        "id": "pay1",
        "externalId": "QB-PAY-123",
        "amount": 25000,
        "receivedAt": "2024-01-15T10:00:00.000Z",
        "paymentMethod": "CHECK",
        "status": "APPLIED",
        "referenceNumber": "CHK-1001"
      }
    ]
  }
]
```

#### GET /api/v1/finance/ar/jobs/:jobId

Returns AR details for a specific job (same structure as above).

### Finance Dashboard

New `/finance` page in the internal dashboard:

**Summary Cards:**
- Total Outstanding (red)
- Total Paid (green)
- Total Contract Value (blue)
- Partially Paid count (amber)

**AR Status Filter:**
- All Jobs
- Overdue
- Unpaid
- Partially Paid
- Paid

**Jobs Table:**
- Job # (link to job details)
- Customer name
- Job status
- Contract amount
- Amount paid (green)
- Outstanding (red)
- AR status badge (color-coded)
- Invoice due date
- Last payment date
- Actions (View Job link)

**Badge Colors:**
- PAID: Green
- PARTIALLY_PAID: Blue
- UNPAID: Yellow
- OVERDUE: Red

### Integration with Scheduled Sync

The daily scheduled QuickBooks sync automatically:

1. Syncs all active job invoices
2. Syncs payments for each invoice
3. Updates AR status for all jobs
4. No additional configuration required

AR data is refreshed alongside contract amounts during the nightly sync.

### Testing

**FinanceService Tests:**

Located in `apps/core-api/src/modules/finance/__tests__/finance.service.spec.ts`:

- AR summary aggregation (empty, multi-job, null handling)
- Job list filtering by AR status
- Payment DTO mapping
- Single job AR detail retrieval
- Error handling (job not found)

**AccountingService Tests (Updated):**

Existing tests now verify:
- Payment sync from QuickBooks
- AR status computation
- `amountPaid` and `amountOutstanding` calculation
- `lastPaymentAt` tracking

### Future Enhancements

**Phase 5 Sprint 3+:**
- Invoice generation from platform
- Payment plan tracking
- AI-powered payment forecasting
- Integration with payment processors (Stripe, Square)
- Multi-currency support

## AR Aging & Payment Reminder Automation (Phase 5 Sprint 2)

### Overview

Phase 5 Sprint 2 delivers automated AR aging analysis with 5 buckets and intelligent payment reminder workflows.

**Key Features:**

- ✅ AR aging buckets (CURRENT, 1-30, 31-60, 61-90, 91+ days overdue)
- ✅ Automated payment reminders via email for 7+ days overdue invoices
- ✅ 7-day cooldown to prevent reminder spam
- ✅ Integration with existing workflow engine and CX notification system
- ✅ Finance dashboard enhancement with aging visualization

### AR Aging Buckets

Jobs are automatically categorized based on invoice due dates:

| Bucket | Condition | Dashboard Color |
|--------|-----------|----------------|
| CURRENT | Not yet due or no due date | Gray |
| DAYS_1_30 | 1-30 days overdue | Yellow |
| DAYS_31_60 | 31-60 days overdue | Orange |
| DAYS_61_90 | 61-90 days overdue | Red |
| DAYS_91_PLUS | 91+ days overdue | Dark Red |

### AR Aging Endpoint

#### GET /api/v1/finance/ar/aging

Returns aging summary with buckets:

```json
{
  "generatedAt": "2024-03-15T10:00:00.000Z",
  "totalOutstanding": 250000,
  "buckets": [
    {
      "bucket": "CURRENT",
      "outstanding": 50000,
      "jobsCount": 5
    },
    {
      "bucket": "DAYS_1_30",
      "outstanding": 100000,
      "jobsCount": 8
    },
    {
      "bucket": "DAYS_31_60",
      "outstanding": 60000,
      "jobsCount": 4
    },
    {
      "bucket": "DAYS_61_90",
      "outstanding": 30000,
      "jobsCount": 2
    },
    {
      "bucket": "DAYS_91_PLUS",
      "outstanding": 10000,
      "jobsCount": 1
    }
  ]
}
```

### Payment Reminder Workflow

**Rule:** `FINANCE_AR_OVERDUE_PAYMENT_REMINDER`

**Trigger Conditions:**
- Job has `arStatus = 'OVERDUE'`
- Amount outstanding > 0
- Invoice is at least 7 days overdue
- No reminder sent within last 7 days (cooldown)

**Actions:**
1. Create CX message with `type = 'PAYMENT_REMINDER'`
2. Send email to customer with templated reminder
3. Create JobNimbus internal task for follow-up
4. Record workflow action log

**Email Template:**
- Friendly tone
- Includes outstanding amount and due date
- No payment links (future enhancement)
- Encourages customer to contact office

**Cooldown Logic:**
WorkflowActionLog tracks last reminder per job. Customers receive maximum one reminder every 7 days to avoid spam.

### Dashboard Enhancements

The `/finance` dashboard now includes:

**AR Aging Analysis Section:**
- 5 cards showing each aging bucket
- Outstanding amount per bucket (color-coded)
- Job count per bucket
- Responsive grid layout

### Testing

**FinanceService Tests (Updated):**
- AR aging bucket computation
- Days overdue calculation
- CURRENT bucket for non-due invoices
- Handling null due dates
- Edge cases (zero/negative outstanding)

**WorkflowService Tests:**
- Payment reminder trigger conditions
- Cooldown enforcement
- CX message creation with EMAIL channel
- JobNimbus task creation
- Email sending (mocked)

### Configuration

No new environment variables required. Uses existing:
- QuickBooks sync settings
- Workflow engine (cron at 4 AM daily)
- CX Engine + Resend email service

### Future Enhancements

**Phase 5 Sprint 3+:**
- Escalation reminders (multiple stages)
- SMS reminders in addition to email
- Custom reminder templates per customer
- Payment links in reminder emails
- AR aging trend analysis

## Changelog

### Phase 5 Sprint 2 (Current)

- ✅ AR aging buckets with 5 categories
- ✅ Automated payment reminder workflow
- ✅ GET /api/v1/finance/ar/aging endpoint
- ✅ Finance dashboard aging visualization
- ✅ Email notifications via CX Engine
- ✅ 7-day cooldown logic
- ✅ Test coverage for aging and reminders

### Phase 5 Sprint 1

- ✅ Payment sync from QuickBooks
- ✅ AR status computation and tracking
- ✅ Finance API endpoints
- ✅ Finance dashboard with AR visibility
- ✅ Test coverage for finance module

### Phase 3 Sprint 1 & 2

- ✅ Initial QuickBooks integration (read-only)
- ✅ Contract amount sync
- ✅ OAuth2 token refresh automation
- ✅ Scheduled daily sync
- ✅ Accounting source tracking
- ✅ Profit dashboard UI enhancements
- ✅ Sync endpoints (single + batch)
- ✅ Test coverage (accounting service)

### Planned

- ⏳ Invoice generation and management
- ⏳ Payment reminder automation
- ⏳ Cost breakdown sync
- ⏳ Multi-invoice support
- ⏳ AR aging reports
- ⏳ Webhook integration
