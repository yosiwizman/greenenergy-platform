# Executive Weekly Digest & Reporting (Phase 6 Sprint 2)

## Overview

The Executive Weekly Digest is an automated email report system that provides business owners and executives with a comprehensive weekly snapshot of:

- Finance & AR health (summary + aging buckets)
- Cashflow & pipeline forecasts
- Risk & operations metrics
- Workflow automation activity

This system composes data from existing modules (Finance, Forecast, Command Center, Workflow) into a single consolidated view, delivered automatically every Monday morning.

## Features

### 1. Automated Weekly Digest Email

**Schedule**: Every Monday at 7:00 AM (server time)

**Contents**:
- **Key Metrics**:
  - High-risk jobs count
  - Open safety incidents
  - Overdue AR jobs
  - Workflows triggered (during digest period)

- **Finance & AR Summary**:
  - Total outstanding AR
  - Total paid
  - Total contract value
  - Job payment status breakdown (Paid, Partially Paid, Unpaid, Overdue)

- **AR Aging Analysis**:
  - Current (not yet due)
  - 1-30 days overdue
  - 31-60 days overdue
  - 61-90 days overdue
  - 91+ days overdue

- **Cashflow & Pipeline Forecast**:
  - Forecast horizon (weeks)
  - Total pipeline amount
  - Weighted pipeline (by win probability)
  - Top pipeline stages by weighted value

### 2. Internal Preview Dashboard

**Route**: `/exec-report` in Internal Dashboard

**Capabilities**:
- Real-time preview of the weekly digest
- Manual trigger for sending digest emails
- Visual display of all metrics in a dashboard format
- Two-column layout (Finance/AR on left, Forecast on right)

### 3. API Endpoints

All endpoints require Internal API Key authentication.

#### GET `/api/v1/exec-report/weekly`

Preview the weekly digest without sending.

**Response**:
```json
{
  "generatedAt": "2025-12-11T12:00:00Z",
  "periodStart": "2025-12-02T00:00:00Z",
  "periodEnd": "2025-12-08T23:59:59Z",
  "financeArSummary": { ... },
  "financeAgingSummary": { ... },
  "forecastOverview": { ... },
  "keyCounts": { ... }
}
```

#### POST `/api/v1/exec-report/weekly/send`

Manually trigger sending the weekly digest email.

**Request Body** (optional):
```json
{
  "recipientsOverride": ["custom@email.com"]
}
```

**Response**:
```json
{
  "ok": true
}
```

## Configuration

### Environment Variables

Add to `apps/core-api/.env`:

```bash
# Executive Weekly Digest (Phase 6 Sprint 2)
EXEC_DIGEST_RECIPIENTS="owner@yourdomain.com,partner@yourdomain.com"
```

**Notes**:
- Multiple recipients are separated by commas
- If not configured, the cron job will log a warning but not fail
- Manual sends via API can override recipients using the request body

### Email Provider

The digest uses the existing `EmailNotificationService` (Resend-based). Ensure the following are configured:

```bash
NOTIFICATIONS_EMAIL_PROVIDER="resend"
RESEND_API_KEY="your-resend-api-key"
NOTIFICATIONS_FROM_EMAIL="no-reply@yourdomain.com"
```

## Digest Period Calculation

The digest period is **the previous week (Monday–Sunday)**.

- If the cron runs on Monday, Dec 9, it covers Dec 2 (Mon) – Dec 8 (Sun)
- Workflow action counts are for that specific period
- All other metrics (AR, risk, safety) are current snapshots as of digest generation

## Architecture

### Services

#### ExecutiveReportService
- **Location**: `apps/core-api/src/modules/executive-report/executive-report.service.ts`
- **Dependencies**:
  - FinanceService (AR summary & aging)
  - ForecastService (cashflow + pipeline)
  - CommandCenterService (risk & operations overview)
  - EmailNotificationService (digest email sending)
  - PrismaService (workflow action log queries)
  - ConfigService (recipient configuration)

**Key Methods**:
- `buildWeeklyDigest()`: Composes the full digest DTO
- `sendWeeklyDigest()`: Builds and emails digest to configured recipients
- `handleWeeklyDigestCron()`: Cron job handler (Monday 7am)

#### ExecutiveReportController
- **Location**: `apps/core-api/src/modules/executive-report/executive-report.controller.ts`
- **Routes**:
  - `GET /api/v1/exec-report/weekly`
  - `POST /api/v1/exec-report/weekly/send`
- **Guards**: `InternalApiKeyGuard`

#### EmailNotificationService (Extended)
- **Location**: `apps/core-api/src/modules/notifications/email-notification.service.ts`
- **New Method**: `sendExecutiveDigestEmail()`
- **Email Body**: Multi-section text format with sections for Key Metrics, Finance/AR, Aging, and Forecast

### Types

New shared types in `@greenenergy/shared-types`:

```typescript
export interface ExecutiveDigestKeyCountsDTO {
  highRiskJobs: number;
  safetyIncidentsOpen: number;
  overdueArJobs: number;
  workflowsTriggeredLastPeriod: number;
}

export interface ExecutiveDigestDTO {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  financeArSummary: ArSummaryDTO;
  financeAgingSummary: ArAgingSummaryDTO;
  forecastOverview: ForecastOverviewDTO;
  keyCounts: ExecutiveDigestKeyCountsDTO;
}
```

## Testing

### Unit Tests

- **File**: `apps/core-api/src/modules/executive-report/__tests__/executive-report.service.spec.ts`
- **Coverage**:
  - Digest building with all required fields
  - Parallel service calls
  - Email sending with configured recipients
  - Email not sent when recipients are missing
  - Recipients override functionality
  - Cron job error handling

### Manual Testing

1. **Preview Digest**:
   ```bash
   curl -H "X-Internal-API-Key: your-key" \
     http://localhost:3000/api/v1/exec-report/weekly
   ```

2. **Send Digest**:
   ```bash
   curl -X POST \
     -H "X-Internal-API-Key: your-key" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/v1/exec-report/weekly/send
   ```

3. **Dashboard Preview**:
   - Navigate to `http://localhost:3001/exec-report` in Internal Dashboard
   - Click "Refresh" to reload data
   - Click "Send Digest Email Now" to manually trigger

## Deployment Checklist

Before deploying to staging/production:

1. ✓ Configure `EXEC_DIGEST_RECIPIENTS` with valid email addresses
2. ✓ Verify email provider credentials (`RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`)
3. ✓ Confirm cron schedule aligns with desired timezone (server time = Monday 7am)
4. ✓ Test manual send via API and dashboard
5. ✓ Verify digest email formatting in recipient inbox
6. ✓ Confirm all dependent services (Finance, Forecast, Command Center) are healthy

## Future Enhancements (Not in v1)

- PDF digest generation and attachment
- Configurable digest schedule (weekly/biweekly/monthly)
- Customizable digest sections per recipient
- HTML-formatted emails with charts/graphs
- Historical digest archive and comparison
- Push notifications (Slack, SMS) in addition to email
- Executive dashboard analytics (digest open rates, engagement)

## Related Documentation

- [Finance & AR System](./10-finance-and-ar.md)
- [Forecasting & Analytics](./17-forecasting-and-analytics.md)
- [Command Center](./14-command-center.md)
- [Workflow Automation](./12-workflow-automation.md)
- [Email Notifications](./08-customer-experience-engine.md#email-notifications)

## Support

For questions or issues with the Executive Digest system:

1. Check logs in `ExecutiveReportService` for cron job execution
2. Verify `EmailNotificationService` logs for email sending status
3. Confirm environment variables are correctly set
4. Test digest generation via API endpoint to isolate issues
5. Review dependent service health (Finance, Forecast, etc.)
