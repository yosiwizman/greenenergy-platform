import { Injectable, Logger } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * Service that manages Prometheus metrics for the application.
 * Provides metrics for HTTP requests, cron jobs, and external service health.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // HTTP metrics
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationMs: Histogram<string>;

  // Cron job metrics
  private readonly cronJobsLastRunTimestamp: Gauge<string>;

  // External service health metrics
  private readonly externalServiceStatus: Gauge<string>;

  constructor() {
    // Initialize registry
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    // Initialize HTTP request counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.registry],
    });

    // Initialize HTTP request duration histogram
    this.httpRequestDurationMs = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      registers: [this.registry],
    });

    // Initialize cron job last run timestamp gauge
    this.cronJobsLastRunTimestamp = new Gauge({
      name: 'cron_jobs_last_run_timestamp',
      help: 'Unix timestamp of the last successful cron job run',
      labelNames: ['job_name'],
      registers: [this.registry],
    });

    // Initialize external service status gauge
    this.externalServiceStatus = new Gauge({
      name: 'external_service_status',
      help: 'External service health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['service_name'],
      registers: [this.registry],
    });

    this.logger.log('MetricsService initialized with Prometheus registry');
  }

  /**
   * Get all metrics in Prometheus text exposition format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Record an HTTP request for metrics tracking
   */
  observeHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    try {
      // Normalize path to avoid high cardinality
      const normalizedPath = this.normalizePath(path);

      // Increment total requests counter
      this.httpRequestsTotal.inc({
        method,
        path: normalizedPath,
        status_code: statusCode.toString(),
      });

      // Observe request duration
      this.httpRequestDurationMs.observe(
        {
          method,
          path: normalizedPath,
          status_code: statusCode.toString(),
        },
        durationMs,
      );
    } catch (error) {
      this.logger.error(`Failed to observe HTTP request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set the last run timestamp for a cron job
   */
  setCronLastRunTimestamp(jobName: string): void {
    try {
      const timestamp = Date.now() / 1000; // Convert to seconds
      this.cronJobsLastRunTimestamp.set({ job_name: jobName }, timestamp);
      this.logger.debug(`Set cron last run timestamp for ${jobName}: ${timestamp}`);
    } catch (error) {
      this.logger.error(`Failed to set cron timestamp for ${jobName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set the health status of an external service
   */
  setExternalServiceStatus(serviceName: string, isHealthy: boolean): void {
    try {
      const status = isHealthy ? 1 : 0;
      this.externalServiceStatus.set({ service_name: serviceName }, status);
      this.logger.debug(`Set external service status for ${serviceName}: ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to set external service status for ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Normalize path to reduce cardinality in metrics
   * Replaces specific IDs with generic placeholders
   */
  private normalizePath(path: string): string {
    // Replace UUIDs, numeric IDs, and other variable path segments
    return path
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id')
      .replace(/\/[0-9]+/g, '/:id')
      .replace(/\/jnb_[a-zA-Z0-9]+/g, '/:jnbId');
  }
}
