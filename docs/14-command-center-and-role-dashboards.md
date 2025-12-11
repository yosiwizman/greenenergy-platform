# Command Center & Role-Based Dashboards

**Status**: ✅ Delivered (Phase 3 Sprint 6)

## Overview

The Command Center provides a unified, real-time operational overview that aggregates critical metrics from across the entire platform. It serves as the central hub for executives, production managers, safety officers, and finance teams to quickly assess operational health and identify jobs requiring immediate attention.

### Purpose

- **Executive Dashboard**: High-level portfolio metrics, risk assessment, and profitability overview
- **Operational Intelligence**: Real-time visibility into jobs needing attention across QC, safety, scheduling, materials, and finance
- **Role-Based Views**: Tailored metric groupings for different stakeholder roles
- **Workflow Integration**: Snapshot of automation activity and rule execution

## Data Model

### CommandCenterSummaryDTO

Top-level aggregate metrics displayed in the header summary cards.

```typescript
export interface CommandCenterSummaryDTO {
  jobsInProgress: number;           // Jobs not CANCELLED or COMPLETE
  jobsHighRisk: number;              // Jobs with HIGH risk level
  jobsAtRiskSchedule: number;        // Jobs with HIGH scheduling risk
  openSafetyIncidents: number;       // Safety incidents not RESOLVED/CLOSED
  subsGreen: number;                 // Subcontractors with GREEN performance
  subsYellow: number;                // Subcontractors with YELLOW performance
  subsRed: number;                   // Subcontractors with RED performance
  warrantiesExpiringSoon: number;    // Active warranties expiring within 30 days
  materialOrdersDelayed: number;     // Material orders past expected delivery
  lowMarginHighRiskJobs: number;     // Jobs with <10% margin AND HIGH risk
  workflowActionsLast24h: number;    // Workflow automation actions in last 24h
}
```

### CommandCenterRoleViewDTO

Metrics grouped by organizational role for targeted operational insights.

```typescript
export interface CommandCenterRoleViewDTO {
  executive: {
    totalJobs: number;
    jobsInProgress: number;
    jobsHighRisk: number;
    avgMarginPercent?: number | null;
  };
  production: {
    jobsWithQcIssues: number;          // QC checks with FAIL status
    jobsWithDelayedMaterials: number;  // Material orders past ETA
    jobsWithSchedulingRisk: number;    // Jobs with MEDIUM/HIGH scheduling risk
  };
  safety: {
    openIncidents: number;             // Incidents not RESOLVED/CLOSED
    highSeverityIncidents: number;     // HIGH/CRITICAL severity open incidents
    incidentsLast30Days: number;       // All incidents in last 30 days
  };
  finance: {
    lowMarginJobs: number;             // Jobs with <10% margin
    lowMarginHighRiskJobs: number;     // Jobs with <10% margin AND HIGH risk
    totalContractAmount?: number | null; // Sum of all contract amounts
  };
}
```

### CommandCenterJobAttentionDTO

Individual jobs that need immediate attention based on one or more risk factors.

```typescript
export interface CommandCenterJobAttentionDTO {
  jobId: string;
  customerName?: string | null;
  status?: string | null;
  riskLevel?: string | null;          // 'LOW' | 'MEDIUM' | 'HIGH'
  hasQcFail?: boolean;                // QC check failed
  hasOpenSafetyIncident?: boolean;    // Open safety incident
  hasDelayedMaterials?: boolean;      // Material order past expected delivery
  hasExpiringWarranty?: boolean;      // Warranty expiring within 30 days
  isLowMarginHighRisk?: boolean;      // <10% margin AND HIGH risk
  lastUpdatedAt?: string | null;      // ISO timestamp
}
```

### CommandCenterOverviewDTO

Complete command center data structure combining all metrics and attention jobs.

```typescript
export interface CommandCenterOverviewDTO {
  summary: CommandCenterSummaryDTO;
  roleViews: CommandCenterRoleViewDTO;
  jobsNeedingAttention: CommandCenterJobAttentionDTO[];
}
```

## API Endpoints

All endpoints require authentication via `x-internal-api-key` header (protected by `InternalApiKeyGuard`).

### GET /api/v1/command-center/overview

Returns complete command center overview with summary metrics, role views, and jobs needing attention.

**Authentication**: Internal API Key (`x-internal-api-key` header)

**Response**:

```json
{
  "summary": {
    "jobsInProgress": 85,
    "jobsHighRisk": 12,
    "jobsAtRiskSchedule": 8,
    "openSafetyIncidents": 3,
    "subsGreen": 45,
    "subsYellow": 8,
    "subsRed": 2,
    "warrantiesExpiringSoon": 5,
    "materialOrdersDelayed": 7,
    "lowMarginHighRiskJobs": 4,
    "workflowActionsLast24h": 23
  },
  "roleViews": {
    "executive": {
      "totalJobs": 150,
      "jobsInProgress": 85,
      "jobsHighRisk": 12,
      "avgMarginPercent": 18.5
    },
    "production": {
      "jobsWithQcIssues": 9,
      "jobsWithDelayedMaterials": 7,
      "jobsWithSchedulingRisk": 14
    },
    "safety": {
      "openIncidents": 3,
      "highSeverityIncidents": 1,
      "incidentsLast30Days": 8
    },
    "finance": {
      "lowMarginJobs": 15,
      "lowMarginHighRiskJobs": 4,
      "totalContractAmount": 4250000
    }
  },
  "jobsNeedingAttention": [
    {
      "jobId": "clxyz123",
      "customerName": "John Smith",
      "status": "IN_PROGRESS",
      "riskLevel": "HIGH",
      "hasQcFail": true,
      "hasOpenSafetyIncident": false,
      "hasDelayedMaterials": true,
      "hasExpiringWarranty": false,
      "isLowMarginHighRisk": true,
      "lastUpdatedAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### GET /api/v1/command-center/jobs-needing-attention

Returns only the list of jobs needing attention (useful for focused views or polling).

**Authentication**: Internal API Key (`x-internal-api-key` header)

**Response**:

```json
[
  {
    "jobId": "clxyz123",
    "customerName": "John Smith",
    "status": "IN_PROGRESS",
    "riskLevel": "HIGH",
    "hasQcFail": true,
    "hasOpenSafetyIncident": false,
    "hasDelayedMaterials": true,
    "hasExpiringWarranty": false,
    "isLowMarginHighRisk": true,
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  }
]
```

## Internal Dashboard

### Route: `/command-center`

The Command Center dashboard is implemented as a Next.js server component that fetches data from the core API on each page load.

#### Page Sections

1. **Header**
   - Title: "Command Center"
   - Subtitle: Real-time operational overview

2. **Top Summary Cards** (4-column grid)
   - Jobs In Progress
   - High-Risk Jobs
   - Open Safety Incidents
   - Low-Margin High-Risk Jobs

3. **Executive View** (4-column grid)
   - Total Jobs
   - Jobs In Progress
   - High-Risk Jobs
   - Average Margin %

4. **Production View** (3-column grid)
   - Jobs with QC Issues
   - Delayed Materials
   - Scheduling Risk

5. **Safety View** (3-column grid)
   - Open Incidents
   - High Severity Incidents
   - Incidents (Last 30 Days)

6. **Finance View** (3-column grid)
   - Low-Margin Jobs
   - Low-Margin + High-Risk
   - Total Contract Amount

7. **Workflow Activity Snapshot**
   - Actions fired in last 24h
   - Link to `/workflows` for details

8. **Jobs Needing Attention Table**
   - Columns: Job ID, Customer, Status, Risk, Issues, Last Updated
   - Job ID links to `/risk/[jobId]` detail view
   - Issue badges: QC, Safety, Materials, Warranty, Finance
   - Empty state: "No jobs need immediate attention right now"

9. **Additional Summary Cards** (3-column grid)
   - Subcontractor Status (Green/Yellow/Red breakdown)
   - Warranties Expiring Soon (within 30 days)
   - Material Orders Delayed (past expected delivery)

#### Features

- **Server-Side Rendering**: Data fetched fresh on every page load (no stale data)
- **Error Handling**: Graceful error banner if API fetch fails
- **Responsive Layout**: Cards stack on mobile, grid on desktop
- **Color-Coded Metrics**: Visual hierarchy (red for high-risk, amber for warnings, green for positive)
- **Deep Links**: Job IDs link to Risk Dashboard detail view
- **Empty States**: Helpful messages when no attention needed
- **Badge System**: Consistent color coding across risk levels and issue types

## Dependencies

The Command Center service aggregates data from multiple modules:

### Data Sources

1. **Job** - Job count, status filtering, active jobs
2. **JobRiskSnapshot** - Risk levels (LOW/MEDIUM/HIGH)
3. **JobFinancialSnapshot** - Margin calculations, scheduling risk, contract amounts
4. **QCPhotoCheck** - QC pass/fail status
5. **SafetyIncident** - Incident counts by status and severity
6. **Subcontractor** - Performance status (GREEN/YELLOW/RED)
7. **Warranty** - Active warranties and expiration dates
8. **MaterialOrder** - Delivery status and ETA tracking
9. **WorkflowActionLog** - Automation activity tracking

### Module Integration

The Command Center **does not** directly inject other service modules to avoid circular dependencies. Instead, it uses direct Prisma queries to aggregate data from the underlying database tables. This approach:

- ✅ Avoids circular dependency issues
- ✅ Improves performance with optimized aggregate queries
- ✅ Maintains single source of truth (Prisma schema)
- ✅ Simplifies testing with mocked Prisma client

## Performance Considerations

### Query Optimization

- Uses Prisma `count()` and `aggregate()` for efficient metric computation
- Limits "jobs needing attention" query to 100 results (sorted by most recent update)
- Parallel query execution via `Promise.all()` where possible
- No N+1 query patterns (uses `include` for related data)

### Caching Strategy

- Dashboard uses `cache: 'no-store'` for real-time data
- Consider adding short-term caching (5-15 minutes) for high-traffic scenarios
- API responses are deterministic and can be cached at reverse proxy layer

### Scalability

Current implementation scales well to:
- **Jobs**: 500-1000 active jobs
- **Response Time**: <2 seconds for full overview
- **Database Load**: ~15 optimized aggregate queries

For larger deployments (>1000 active jobs), consider:
- Materialized views for pre-computed metrics
- Redis caching layer with 5-minute TTL
- Paginated "jobs needing attention" results

## Testing

### Unit Tests

Location: `apps/core-api/src/modules/command-center/__tests__/command-center.service.spec.ts`

#### Test Coverage

1. **getOverview()** - Returns properly shaped `CommandCenterOverviewDTO`
2. **getOverview()** - Handles empty data gracefully (zero counts, null values)
3. **getJobsNeedingAttention()** - Returns jobs with multiple issues flagged correctly
4. **getJobsNeedingAttention()** - Returns empty array when no jobs have issues

#### Mock Strategy

- Prisma client fully mocked with `jest.mock('@greenenergy/db')`
- All count/aggregate queries return controlled test data
- Tests verify data shape, not business logic (which is in Prisma queries)

### Running Tests

```bash
# Run all core-api tests
pnpm --filter @greenenergy/core-api test

# Run only command-center tests
pnpm --filter @greenenergy/core-api test command-center

# Watch mode
pnpm --filter @greenenergy/core-api test:watch command-center
```

## Configuration

### Environment Variables

**Core API** (`apps/core-api/.env`):

```bash
# Required for authentication
INTERNAL_API_KEY="your-internal-api-key-here"
```

**Internal Dashboard** (`apps/internal-dashboard/.env`):

```bash
# API connection
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api/v1"
NEXT_PUBLIC_INTERNAL_API_KEY="your-internal-api-key-here"
```

### Production Configuration

For production deployments:

1. Use strong, randomly generated `INTERNAL_API_KEY` (min 32 characters)
2. Ensure `NEXT_PUBLIC_API_BASE_URL` points to production API
3. Consider adding rate limiting at reverse proxy layer
4. Monitor query performance with APM tools (DataDog, New Relic, etc.)

## Future Enhancements

### Phase 3 Sprint 6+

**v2 Features**:

1. **Time-Series Charts**
   - Jobs in progress over time
   - Risk level trends
   - Margin trends by week/month

2. **Real-Time Updates**
   - WebSocket integration for live metric updates
   - Push notifications for critical alerts

3. **Custom Dashboards**
   - User-configurable card layouts
   - Saved views per role
   - Custom metric thresholds

4. **Advanced Filtering**
   - Filter jobs needing attention by issue type
   - Date range selectors for historical views
   - Export to CSV/PDF

5. **Drill-Down Views**
   - Per-role dedicated pages (`/command-center/executive`, `/command-center/production`, etc.)
   - Detailed breakdowns of aggregate metrics
   - Historical comparison (YoY, QoQ)

6. **AI-Powered Insights**
   - Anomaly detection for unusual metric changes
   - Predictive alerts for jobs at risk of delays
   - Automated recommendations from AI Ops Assistant

7. **Mobile Optimization**
   - Progressive Web App (PWA) support
   - Native mobile app integration
   - Push notifications for high-priority alerts

## Troubleshooting

### Common Issues

**Issue**: "Unable to load Command Center data" error

**Causes**:
- API is not running or unreachable
- `INTERNAL_API_KEY` mismatch between dashboard and API
- Database connection issue

**Solutions**:
1. Verify core-api is running: `pnpm --filter @greenenergy/core-api dev`
2. Check environment variables match in both apps
3. Test API endpoint directly:
   ```bash
   curl http://localhost:3000/api/v1/command-center/overview \
     -H "x-internal-api-key: your-key"
   ```

---

**Issue**: Metrics seem incorrect or outdated

**Causes**:
- Data not synced from JobNimbus
- Risk/financial snapshots not evaluated recently
- Time zone mismatch in date calculations

**Solutions**:
1. Trigger manual sync: `POST /api/v1/sync/jobs`
2. Re-evaluate risk: `POST /api/v1/risk/evaluate-all`
3. Recalculate financials: `POST /api/v1/profit/recalculate-all`

---

**Issue**: Performance degradation (slow page loads)

**Causes**:
- Large number of active jobs (>1000)
- Database index missing
- N+1 query pattern introduced

**Solutions**:
1. Add database indexes on frequently queried fields
2. Implement Redis caching for aggregate metrics
3. Profile queries with `EXPLAIN ANALYZE` in PostgreSQL
4. Consider materialized views for pre-computed metrics

## Related Documentation

- [Phase 3 Roadmap](./04-phase-3-roadmap.md) - Sprint 6 details
- [Risk Dashboard](./05-jobnimbus-integration.md) - Risk evaluation logic
- [Workflow Automation](./13-workflow-automation.md) - Automation activity tracking
- [Profit Dashboard](./12-accounting-integration.md) - Financial metrics
- [Safety System](./07-safety-system.md) - Safety incident tracking
- [Material & Scheduling](./09-material-scheduling-system.md) - Scheduling risk
- [Subcontractor System](./06-subcontractor-system.md) - Performance status
- [Warranty System](./08-warranty-system.md) - Warranty tracking

## Changelog

### Sprint 6 (Phase 3) - Initial Release

**Date**: 2024-12-11

**Delivered**:
- ✅ Command Center API endpoints (`/overview`, `/jobs-needing-attention`)
- ✅ Shared TypeScript types (`CommandCenter*DTO`)
- ✅ Internal dashboard page (`/command-center`)
- ✅ Role-based metric groupings (Executive, Production, Safety, Finance)
- ✅ Jobs needing attention table with multi-factor flagging
- ✅ Workflow activity snapshot with link to `/workflows`
- ✅ Unit tests for CommandCenterService
- ✅ Comprehensive documentation

**Technical Details**:
- Backend: NestJS service with direct Prisma queries
- Frontend: Next.js 14 server component with SSR
- Authentication: InternalApiKeyGuard
- Performance: <2s response time for full overview
- Test Coverage: 4 test scenarios, 124 total passing tests in core-api
