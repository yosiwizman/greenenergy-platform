# Production Readiness & Observability v1

## Overview

Phase 8 Sprint 1 introduces production-grade observability and monitoring infrastructure to the GreenEnergy platform, enabling operations teams to monitor system health, debug issues, and ensure reliability in production environments.

## Key Features

### 1. Structured Request Logging with Correlation IDs

Every HTTP request to the core API is now logged with structured, machine-readable information:

- **Correlation ID**: Unique identifier (`x-request-id`) for end-to-end request tracing
- **Request Details**: Method, path, status code, response time, user agent, client IP
- **Business Context**: Job ID and other relevant context when available

#### Correlation ID Flow

```
Client Request → Middleware (generate/read x-request-id) → Interceptor (log + metrics) → Response (echo x-request-id)
```

- If client sends `x-request-id` header, it's preserved and echoed back
- If absent, a unique ID is generated (`timestamp-randomBytes`)
- Correlation ID is available throughout request lifecycle via `req.correlationId`

#### Log Format Example

```json
{
  "type": "http_request",
  "method": "GET",
  "path": "/api/v1/jobs/abc-123",
  "statusCode": 200,
  "durationMs": 145,
  "correlationId": "lm0x8f-3a4b9c1d2e5f",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100",
  "jobId": "abc-123"
}
```

### 2. Prometheus Metrics Endpoint

The core API exposes a `/api/v1/metrics` endpoint in Prometheus text exposition format.

#### Available Metrics

**HTTP Metrics**
- `http_requests_total{method,path,status_code}`: Total HTTP request count
- `http_request_duration_ms{method,path,status_code}`: HTTP request duration histogram
  - Buckets: 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000 ms

**Cron Job Metrics**
- `cron_jobs_last_run_timestamp{job_name}`: Unix timestamp of last successful cron job run
  - Tracked jobs: `workflow_engine`, `quickbooks_sync`, `warranty_expiry_check`

**External Service Health Metrics**
- `external_service_status{service_name}`: Service health (1 = healthy, 0 = unhealthy)
  - Services: `database`, `jobnimbus`, `quickbooks`, `email`, `sms`

**System Metrics** (default metrics from prom-client)
- CPU usage, memory usage, event loop lag, GC stats, etc.

#### Path Normalization

To prevent high cardinality in metrics, specific IDs in paths are normalized:
- `/api/v1/jobs/123` → `/api/v1/jobs/:id`
- `/api/v1/jobs/abc-def-ghi` → `/api/v1/jobs/:id`
- `/api/v1/jobs/jnb_12345` → `/api/v1/jobs/:jnbId`

#### Usage with Prometheus

Add the following to your Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'greenenergy-core-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['core-api:3000']
    metrics_path: '/api/v1/metrics'
```

### 3. Ops Status API & Dashboard

#### API Endpoint: `GET /api/v1/ops/status`

Protected with `InternalApiKeyGuard` (requires `x-internal-api-key` header).

**Response Format**:

```json
{
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "coreApiHealthy": true,
  "databaseHealthy": true,
  "externalServices": [
    {
      "name": "jobnimbus",
      "status": "UP",
      "lastCheckedAt": "2024-01-15T10:30:00.000Z",
      "details": "Configuration present"
    },
    {
      "name": "quickbooks",
      "status": "DEGRADED",
      "lastCheckedAt": "2024-01-15T10:30:00.000Z",
      "details": "Configuration present but no active OAuth connection"
    },
    {
      "name": "email",
      "status": "UP",
      "lastCheckedAt": "2024-01-15T10:30:00.000Z",
      "details": "SMTP configuration present"
    },
    {
      "name": "sms",
      "status": "DOWN",
      "lastCheckedAt": "2024-01-15T10:30:00.000Z",
      "details": "Twilio configuration incomplete (optional service)"
    }
  ],
  "latestCronRuns": [
    {
      "name": "workflow_engine",
      "lastRunAt": "2024-01-15T04:00:00.000Z"
    },
    {
      "name": "quickbooks_sync",
      "lastRunAt": "2024-01-15T02:00:00.000Z"
    },
    {
      "name": "warranty_expiry_check",
      "lastRunAt": "2024-01-15T03:00:00.000Z"
    }
  ]
}
```

#### Internal Dashboard: `/ops`

The internal dashboard now includes an **Operations Status** page accessible at `/ops`.

**Features**:
- **Overall System Status Banner**: Visual indicator showing "All Systems Operational" or "Issues Detected"
- **Core Platform Cards**: Core API and Database health status
- **External Services Table**: Service name, status badge (UP/DOWN/DEGRADED), last checked time, details
- **Scheduled Jobs Table**: Cron job name, last run timestamp (absolute and relative)
- **Auto-refresh**: Page can be manually refreshed; uses `cache: 'no-store'` for fresh data on each load

**Access**: Navigate to `http://localhost:3002/ops` (or your internal dashboard URL).

### 4. LLM Usage Monitoring Console (Phase 10 Sprint 5)

The core API records LLM usage events to an append-only `llm_call_logs` table to help operators track:
- Call volume
- Success vs fallback vs errors
- Usage by feature/model
- Rough cost estimate
- Recent-call audit log

#### API Endpoints

Protected with `InternalApiKeyGuard` (requires `x-internal-api-key` header).

- `GET /api/v1/llm-usage/summary?days=7|30|90`
- `GET /api/v1/llm-usage/recent?limit=50`

#### Internal Dashboard: `/llm-usage`

The internal dashboard includes an **LLM Usage Monitoring** page at `/llm-usage` showing:
- Summary cards (calls, success/fallback/errors, estimated cost)
- Breakdown tables (by feature, by model)
- Recent call audit table (timestamps, tokens, duration, outcome)

### 5. Health Checks

#### Service Status Determination

**Database**: Simple `SELECT 1` query to verify connectivity.

**JobNimbus**: Checks for presence of `JOBNIMBUS_API_KEY` and `JOBNIMBUS_API_URL`. Status is UP if configured (no actual network call in v1).

**QuickBooks**: Checks for `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET`, and verifies active OAuth connection in database. Status is DEGRADED if credentials present but no active connection.

**Email**: Checks for `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`. Status is UP if all present.

**SMS (Twilio)**: Checks for `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`. Status is DOWN if incomplete (optional service, so this is expected if not configured).

All checks are lightweight and config-based for v1. Future versions may include active network health checks.

## Implementation Details

### Middleware & Interceptors

**CorrelationIdMiddleware**: Applied globally in `main.ts` to attach `x-request-id` to all requests.

**LoggingInterceptor**: Applied globally in `main.ts` to log all HTTP requests and record metrics.

Both are non-blocking and fail gracefully on errors.

### Modules

**MetricsModule**: `@Global()` module providing `MetricsService` for metrics collection and exposure. Automatically available to all modules without explicit import.

**OpsStatusModule**: Provides `OpsStatusService` and `OpsStatusController` for platform health aggregation.

### Cron Job Instrumentation

Three key cron jobs record their successful runs:
1. **Workflow Engine** (`workflow.tasks.ts`): Records `workflow_engine` metric after successful run
2. **QuickBooks Sync** (`accounting.tasks.ts`): Records `quickbooks_sync` metric after successful sync
3. **Warranty Expiry Check** (`warranty.tasks.ts`): Records `warranty_expiry_check` metric after successful check

## Environment Variables

No new environment variables are required. Observability is enabled by default.

Optional: Set `NODE_ENV=production` to disable debug-level logging for performance.

## Monitoring Best Practices

### 1. Request Tracing

When investigating issues:
1. Obtain the `x-request-id` from the response header or client-side error
2. Filter logs by `correlationId` to see the full request lifecycle
3. Cross-reference with metrics for that timeframe

### 2. Alerting Rules (for Prometheus/Grafana)

**High Error Rate**:
```promql
rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
```

**Slow Requests**:
```promql
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
```

**Stale Cron Jobs**:
```promql
time() - cron_jobs_last_run_timestamp > 86400  # 24 hours
```

**External Service Down**:
```promql
external_service_status{service_name="database"} == 0
```

### 3. Dashboard Widgets

Recommended Grafana dashboards:
- **HTTP Request Rate**: `rate(http_requests_total[1m])`
- **Request Duration (p50, p95, p99)**: `http_request_duration_ms` quantiles
- **Error Rate by Endpoint**: `rate(http_requests_total{status_code=~"5.."}[5m])` grouped by `path`
- **Cron Job Staleness**: `time() - cron_jobs_last_run_timestamp`

## Limitations & Future Enhancements

**Current Limitations**:
- External service health checks are config-based only (no active network pings)
- Metrics are in-memory (reset on app restart)
- No distributed tracing (single service only)
- No log aggregation (logs are written to stdout/stderr)

**Phase 8 Sprint 2 Enhancements** (if needed):
- Active health checks for external services (with circuit breakers)
- Persistent metrics (e.g., push to remote storage)
- Distributed tracing with OpenTelemetry
- Log aggregation with structured log shipping (e.g., to Loki, Elasticsearch)
- Custom business metrics (e.g., jobs completed per day, revenue metrics)

## Testing

Unit tests are provided for:
- `MetricsService`: Validates metrics registration and recording
- `OpsStatusService`: Validates health checks and cron metric parsing

Run tests:
```bash
pnpm test
```

## Troubleshooting

**Metrics endpoint returns 404**:
- Ensure `MetricsModule` is imported in `AppModule`
- Verify API is running on `/api/v1/metrics`

**Ops status endpoint returns 401**:
- Ensure `x-internal-api-key` header is set correctly
- Verify `INTERNAL_API_KEY` environment variable is configured

**Cron jobs not appearing in ops status**:
- Cron jobs only appear after their first successful run
- Verify cron jobs are enabled (e.g., `WORKFLOW_AUTOMATION_ENABLED=true`)

**Correlation IDs not in logs**:
- Check that `CorrelationIdMiddleware` is applied in `main.ts`
- Verify `LoggingInterceptor` is registered globally

## Related Documentation

- [11. Deployment and Environments](./11-deployment-and-environments.md) - Environment setup and deployment guidelines
- [16. Staging Smoke Tests and Go-Live Checklist](./16-staging-smoke-tests-and-go-live-checklist.md) - Production readiness checklist

## Summary

Phase 8 Sprint 1 provides a solid foundation for production observability:
- **Structured logs with correlation IDs** enable end-to-end request tracing
- **Prometheus metrics** provide quantitative insights into system performance
- **Ops status API and dashboard** give operations teams real-time visibility into platform health
- **Cron job monitoring** ensures scheduled tasks are running on time

This infrastructure is production-ready, deterministic, and follows industry best practices for SaaS observability.
