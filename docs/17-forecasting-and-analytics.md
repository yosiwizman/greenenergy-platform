# Forecasting & Analytics (Phase 6 Sprint 1)

## Overview

The Forecasting Dashboard provides executive-level insights into future cash flow and weighted pipeline values. This is a **deterministic** forecasting system based on existing job and invoice data—no AI or machine learning models are used in v1.

**Key Features:**
- ✅ 12-week (configurable) cashflow forecast based on open invoices
- ✅ Weighted pipeline forecast using status-based win probabilities
- ✅ Executive dashboard with summary metrics and visualizations
- ✅ REST API endpoints for programmatic access
- ✅ Fully deterministic calculations (no external AI dependencies)

## Architecture

### Forecasting Service

The `ForecastService` (`apps/core-api/src/modules/forecast/forecast.service.ts`) provides three main methods:

1. **`getCashflowForecast(horizonWeeks)`** - Projects expected cash inflows
2. **`getPipelineForecast()`** - Calculates weighted pipeline by job status
3. **`getForecastOverview(horizonWeeks)`** - Combines both forecasts

### Data Sources

**Cashflow Forecast:**
- `Invoice` table: Open invoices with `balance > 0`
- Uses `dueDate` to assign invoices to weekly buckets
- Overdue invoices (past due date) contribute to first week with `overduePortion` flag

**Pipeline Forecast:**
- `Job` table: Jobs not in terminal states (COMPLETE, CANCELLED, LOST)
- `JobFinancialSnapshot`: Contract amounts
- Filters out fully paid jobs (`arStatus = 'PAID'`)

## Cashflow Forecasting

### Algorithm

1. **Initialize weekly buckets** for N weeks (default 12)
   - Week boundaries: Monday to Sunday
   - Each bucket tracks: `expectedInflow`, `invoiceCount`, `overduePortion`

2. **Fetch open invoices** where `status = 'OPEN'` OR `balance > 0`

3. **Assign invoices to buckets**:
   - **No due date**: Assign to first bucket
   - **Past due (overdue)**: Assign to first bucket, add to `overduePortion`
   - **Future due date**: Assign to bucket containing that date
   - **Beyond horizon**: Ignored for this forecast

4. **Return** `CashflowForecastDTO` with weekly points

### Response Format

```json
{
  "generatedAt": "2024-03-01T10:00:00.000Z",
  "horizonWeeks": 12,
  "points": [
    {
      "date": "2024-03-04",  // Week ending (Monday of week)
      "expectedInflow": 125000,
      "invoiceCount": 3,
      "overduePortion": 25000
    },
    // ... 11 more weeks
  ]
}
```

## Pipeline Forecasting

### Win Probability Mapping

The system uses deterministic win probabilities based on job status:

| Status | Label | Win Probability |
|--------|-------|----------------|
| LEAD | Lead | 20% (0.2) |
| QUALIFIED | Qualified | 30% (0.3) |
| SITE_SURVEY | Site Survey | 40% (0.4) |
| DESIGN | Design | 50% (0.5) |
| PERMITTING | Permitting | 60% (0.6) |
| APPROVED | Approved | 70% (0.7) |
| SCHEDULED | Scheduled | 85% (0.85) |
| IN_PROGRESS | In Progress | 95% (0.95) |
| *Unknown* | [Status Key] | 15% (0.15) |

### Algorithm

1. **Fetch pipeline jobs**:
   - Status NOT IN ('COMPLETE', 'CANCELLED', 'LOST')
   - `arStatus ≠ 'PAID'` (filter out fully paid)

2. **Aggregate by status**:
   - Count jobs per status
   - Sum `contractAmount` per status
   - Apply win probability: `weightedAmount = totalAmount × winProbability`

3. **Calculate totals**:
   - `totalPipelineAmount = Σ(totalAmount across all buckets)`
   - `totalWeightedAmount = Σ(weightedAmount across all buckets)`

4. **Sort buckets** by weighted amount descending

### Response Format

```json
{
  "generatedAt": "2024-03-01T10:00:00.000Z",
  "totalPipelineAmount": 1500000,
  "totalWeightedAmount": 850000,
  "buckets": [
    {
      "statusKey": "SCHEDULED",
      "statusLabel": "Scheduled",
      "winProbability": 0.85,
      "jobsCount": 5,
      "totalAmount": 500000,
      "weightedAmount": 425000
    },
    // ... other statuses
  ]
}
```

## API Endpoints

All endpoints require `x-internal-api-key` header for authentication.

### GET /api/v1/forecast/cashflow

Returns cashflow forecast for next N weeks.

**Query Parameters:**
- `weeks` (optional): Number of weeks to forecast (1-52, default: 12)

**Response:** `CashflowForecastDTO`

### GET /api/v1/forecast/pipeline

Returns weighted pipeline forecast by job status.

**Response:** `PipelineForecastDTO`

### GET /api/v1/forecast/overview

Returns complete forecast overview (cashflow + pipeline).

**Query Parameters:**
- `weeks` (optional): Number of weeks for cashflow forecast (1-52, default: 12)

**Response:** `ForecastOverviewDTO`

```json
{
  "generatedAt": "2024-03-01T10:00:00.000Z",
  "cashflow": { /* CashflowForecastDTO */ },
  "pipeline": { /* PipelineForecastDTO */ }
}
```

## Dashboard Integration

### Executive Dashboard

The `/forecast` page in the internal dashboard provides:

1. **Summary Cards** (top row):
   - Total Pipeline (Gross)
   - Weighted Pipeline
   - Expected Inflow (Next 30 Days)
   - Expected Inflow (Next 90 Days)

2. **Cashflow Chart**: Weekly visualization of expected inflows with overdue indicators

3. **Pipeline Table**: Status breakdown with:
   - Status label
   - Job count
   - Total amount
   - Win probability (%)
   - Weighted amount

4. **Controls**: Week selector (6 / 12 / 24 weeks)

## Assumptions & Limitations (v1)

### Assumptions

1. **Invoice due dates are accurate** - Cashflow projections rely on QB due dates
2. **Contract amounts are current** - Uses `JobFinancialSnapshot.contractAmount`
3. **Win probabilities are static** - Fixed probabilities per status (not ML-based)
4. **Weekly granularity** - Buckets are by week, not daily
5. **No seasonality** - Does not account for seasonal patterns

### Limitations

1. **No payment velocity modeling** - Assumes customers pay on due date
2. **No confidence intervals** - Deterministic point estimates only
3. **Single-invoice assumption** - Jobs with multiple invoices may have complexities
4. **No external factors** - Weather, economic conditions, etc. not considered
5. **Historical data not used** - Future versions could incorporate trends

## Testing

**ForecastService Tests** (`forecast.service.spec.ts`):
- Empty forecasts when no data
- Future invoice bucketing
- Overdue invoice handling
- Pipeline weighted calculations
- Status filtering (excludes PAID)
- Unknown status default probability

**Coverage**: 9 comprehensive tests for both cashflow and pipeline logic

## Future Enhancements (Phase 6 Sprint 2+)

### AI-Powered Forecasting

- **Payment velocity modeling** using historical payment patterns
- **Confidence intervals** based on historical variance
- **Anomaly detection** for unusual pipeline changes
- **Seasonality adjustment** using time-series analysis
- **Win probability ML model** trained on historical conversions

### Advanced Features

- **Scenario analysis** (best case / worst case / likely)
- **Pipeline cohort analysis** (aging by status duration)
- **Customer payment scoring** (likelihood to pay on time)
- **Integration with financial planning tools**
- **Alert system** for forecast deviations

## Configuration

No new environment variables required. Uses existing:
- Database connection (`DATABASE_URL`)
- Internal API key (`INTERNAL_API_KEY`)

## Changelog

### Phase 6 Sprint 1 (Current)

- ✅ Cashflow forecast (12-week default, configurable 1-52 weeks)
- ✅ Pipeline forecast with weighted values
- ✅ Forecast API endpoints
- ✅ Deterministic calculations (no AI)
- ✅ Executive dashboard `/forecast` page
- ✅ Test coverage for forecast logic

### Planned

- ⏳ AI-powered payment velocity modeling
- ⏳ Confidence intervals and scenarios
- ⏳ Historical trend analysis
- ⏳ Integration with budgeting tools
